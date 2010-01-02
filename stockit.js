// stockit v0.1
// Created by kmdsbng, yaotti
//
// stock pages to local storage

// LogWindow utility
var LogWindow = {};
LogWindow.log = (function () {
  var DEBUG_WINDOW_TITLE = 'Debug Window';
  var outputTab = null;

  function findOutputTab() {
    var tabs = jetpack.tabs;
    for (var i=0; i < tabs.length; i++) {
      var doc = tabs[i].contentDocument;
      var title = $('title', doc).text();
      if (title === DEBUG_WINDOW_TITLE)
        return tabs[i];
    }
    return null;
  }

  function openOutputTab() {
    var tab = jetpack.tabs.open('about:blank');
    var doc = tab.contentDocument;
    doc.write('<html><head><title>' + DEBUG_WINDOW_TITLE + '</title></head><body><ul id="debugList"></ul></body></html>');
    return tab;
  }

  function prepareTab() {
    if (outputTab)
      return outputTab;

    var tab = findOutputTab();
    if (!tab)
      tab = openOutputTab();
    outputTab = tab;
    return tab;
  }

  function onTabClosed(tab) {
    if (tab == outputTab)
      outputTab = null;
  }
  jetpack.tabs.onClose(function (){onTabClosed(this);});


  return function writeLog(text) {
    var tab = prepareTab();
    var doc = tab.contentDocument;
    $('#debugList', doc).append('<li>' + text + '</li>');
  }
})();

// Tracer utility
var Tracer = {};
Tracer.wrap = function(receiver, methodNames, notifyMethod) {
  function makeValueStr(v) {
    return (typeof(v) == 'number' || typeof(v) == 'string') ? v.toString() : typeof(v);
  }

  function makeArgsSignature(args) {
    var result = [];
    for (var i=0; i < args.length; i++) {
      result.push(makeValueStr(args[i]));
    }
    return result.join(', ');
  }

  function makeSignature(name, args) {
    return name + '(' + makeArgsSignature(args) + ')';
  }

  function makeNotifier(receiver, name, content) {
    var name = methodNames[i];
    var content = receiver[name];
    var signature = makeSignature(name, arguments);
    receiver[name] = function () {
      notifyMethod('enter ' + signature);
      content.apply(this, arguments);
    }
  }

  if (!notifyMethod)
    notifyMethod = console.log;
  if (typeof(methodNames) === 'string')
    methodNames = [methodNames];
  for (var i=0; i < methodNames.length; i++) {
    var name = methodNames[i];
    var content = receiver[name];
    var signature = makeSignature(name, arguments);
    receiver[name] = function () {
      notifyMethod('enter ' + signature);
      content.apply(this, arguments);
    }
  }
}

var manifest = {
    settings: [
        {id:"ratio", type:"range", label:"Ratio", min: 30, max: 100, default: 50 },
        {id:"thumbnails", type:"boolean", label:"Thumbnails?", default: true }
    ]
};

jetpack.future.import("storage.simple");
jetpack.future.import('menu');
jetpack.future.import("slideBar");
// delete this line because error occured in jetpack 0.7
//jetpack.future.import("storage.settings");

function createModel() {
  var model = {};
  model.statusBarAreas = [];
  model.slideBarAreas = [];
  model.views = [];
  model.clear = function() {
    stockList.urllist = [];
  }
  return model;
}

function createSlideView(slide) {
  var slideItems = [];

  function getTabFavicon(tab) {
      return (!tab || /^chrome:/.test(tab.favicon)) ? DEFAULT_FAVICON : tab.favicon;
  }

  function getTabTitle(tab) {
      return tab.raw.label;
  }

  function fitTitle(tabTitle) {
      if (tabTitle.length > 25) {
          tabTitle = tabTitle.substr(0, 20);
          tabTitle += "...";
      }
      return tabTitle;
  }

  function showLoadedThumbnail(slideItem, tab, imageData) {
      var canvas = $("canvas", slideItem);
      var img = $("img.preview", slideItem);
      img.attr('src', imageData).show();
      canvas.hide();
  }

  function showTabThumbnail(slideItem, tab) {
      var canvas = $("canvas", slideItem);
      var img = $("img.preview", slideItem);
      var ctx = canvas[0].getContext("2d");
      ctx.drawWindow(tab.contentWindow, 0, 0, 500, 500, "white");
      return canvas[0].toDataURL("image/png");
  }

  function makeSlideItem(tab) {
      return makeSlideItemInner(tab.url, getTabTitle(tab), tab);
  }

  function resumeSlideItemByStorageItem(item) {
      var tab = findTabByUrl(item.url)
      var slideItem = tab ? makeSlideItem(tab)
                          : makeSlideItemInner(item.url, item.title);
      addSlideItem(slideItem, tab, item.url, item.image);
  }

  function addSlideItem(slideItem, tab, url, loadedImageData) {
      slideItems.push(slideItem);
      slideItem.appendTo($("#tabList", slide.contentDocument.body));
      slideItem.appendTo($("#tabList", slide.contentDocument.body)).fadeIn('normal');
      var imageData;
      if (loadedImageData) {
          showLoadedThumbnail(slideItem, tab, loadedImageData);
      } else if (tab) {
          showTabThumbnail(slideItem, tab);
          return getCanvasImageData(slideItem);
      }
  }

  function getCanvasImageData(slideItem) {
      var canvas = $("canvas", slideItem);
      return canvas[0].toDataURL("image/png");
  }

  function findTabByUrl(url) {
      for (var i = 0; i < jetpack.tabs.length; i++)
          if (jetpack.tabs[i].url == url)
              return jetpack.tabs[i];
      return null;
  }

  function getSlideIndexByUrl(url) {
      var finded = findSlideItemWithIndexByUrl(url);
      return finded ? finded[1] : -1;
  }

  function findSlideItemByUrl(url) {
      var finded = findSlideItemWithIndexByUrl(url);
      return finded ? finded[0] : null;
  }

  function findSlideItemWithIndexByUrl(url) {
      return findWithIndex(
                 slideItems, 
                 function (v) {return v.attr('url') == url;});
  }

  function findWithIndex(ary, judge) {
      for (var i=0; i < ary.length; i++) {
          if (judge(ary[i]))
              return [ary[i], i];
      }
      return null;
  }

  function makeSlideItemInner(url, titleText, tab) {
      var slideItem = $("<div />", slide.contentDocument.body);
      slideItem.attr('url', url);
      slideItem.addClass("tab");
      slideItem.click(function(event){
          if (!$(event.target).hasClass("closeButton")) {
              var tab = findTabByUrl(url);
              if (tab)
                  tab.focus();
              else
                  jetpack.tabs.open(url).focus();
          }
      })

      var headerBar = $("<div />", slide.contentDocument.body);
      headerBar.addClass("headerBar");
      slideItem.append(headerBar);

      var favicon = $("<img />", slide.contentDocument.body);
      favicon.attr("src", getTabFavicon(tab));
      favicon.addClass("favicon");
      headerBar.append(favicon);

      var title = $("<div />", slide.contentDocument.body);
      title.addClass("title");
      title.text(fitTitle(titleText));
      headerBar.append(title);

      var closeIcon = $("<img />", slide.contentDocument.body);
      closeIcon.attr("src", CLOSE_TAB_ICON);
      closeIcon.addClass("closeButton");
      closeIcon.click(function () {
          removeStorage(url);
          notifyUpdate();
      });
      headerBar.append(closeIcon);

      var tabPreview = slide.contentDocument.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
      tabPreview.setAttribute("class", "tabPreview");
      slideItem.append(tabPreview);

      var img = $('<img class="preview" src="">', slide.contentDocument);
      img.hide();
      slideItem.append(img);

      return slideItem;
  }

  function removeSlideByURL(url) {
      var finded = findSlideItemWithIndexByUrl(url);
      if (!finded)
          return;
      var slideItem = finded[0];
      var index = finded[1];
      if (slideItem.hasClass("focused")) {
          slideItem.addClass("focusedClosing");
      }
      slideItems.splice(index, 1);
      slideItem.remove();
  }

  function addItem(tab) {
      var slideItem = makeSlideItem(tab);
      return addSlideItem(slideItem, tab, tab.url);
  }


  function clear() {
      for (var i = 0; i < slideItems.length; i++) {
          slideItems[i].remove();
      }
      slideItems = [];
  }

  $("#clear-stock", slide.contentDocument.body).click(function(){
      mainModel.clear();
      notifyUpdate();
      /*
      stockList.urllist = [];
      clear();
      */
  });

  function _notifyUpdate() {
    clear();
    resumeSlide();
  }

  function resumeSlide() {
      for (var i=0; i < stockList.urllist.length; i++) {
          var item = stockList.urllist[i];
          var slideItem = resumeSlideItemByStorageItem(item);
      }
  }
  resumeSlide();
  return {
    notifyUpdate: _notifyUpdate
  }
}

// global objects
var mainModel = createModel();

var stockList = jetpack.storage.simple;
//var notify = function(msg) {jetpack.tabs.focused.contentWindow.alert(msg)};
// Don't use LogWindow on startup because cause strange error such this (on jetpack v0.7) 
// -> [Exception... "Security error" code: "1000" nsresult: "0x805303e8 (NS_ERROR_DOM_SECURITY_ERR)" location: "chrome://jetpack/content/index.html -> file:///.../.../stockit/stockit.js Line: 49"]
var beforeStartup = true;
var notify = function(msg) {
  if (beforeStartup)
    jetpack.notifications.show(uneval(msg))
  else
    LogWindow.log(uneval(msg));
};
const SLIDEBAR_ICON = "http://github.com/kmdsbng/stockit/raw/master/img/stockit_icon.png";
const DEFAULT_FAVICON = "http://tb4.fr/labs/jetpack/thumbtabs/favicon.png";
const CLOSE_TAB_ICON = "http://tb4.fr/labs/jetpack/thumbtabs/close.png";

var addSlide;

var notifyUpdate = function() {
  var statusBars = mainModel.statusBarAreas;
  for (var i=0; i < statusBars.length; i++) {
    var widget = statusBars[i];
    $("#stock-count", widget).text(stockList.urllist.length);
  }

  var views = mainModel.views;
  for (var i=0; i < views.length; i++) {
    views[i].notifyUpdate();
  }
}

function createImageData(tab) {
    var canvas = $("<canvas />", tab.contentDocument);
    var ctx = canvas[0].getContext("2d");
    ctx.drawWindow(tab.contentWindow, 0, 0, 500, 500, "white");
    return canvas[0].toDataURL("image/png");
}

function stockIt() {
    if (!stockList.urllist) stockList.urllist = [];
    var exists = false;
    var url = jetpack.tabs.focused.url;
    stockList.urllist.forEach(function(st){
        exists = exists || (st.url == url);
    })
    if (exists) return;
    var title = $('title', jetpack.tabs.focused.contentDocument).text();
    var imageData = createImageData(jetpack.tabs.focused);
    var stock = {url : url, title: title, image: imageData};
    stockList.urllist.push(stock);
    notifyUpdate();
}

jetpack.menu.context.page.add({
    label: 'StockIt',
    command: function () {
        stockIt();
    }
});

jetpack.statusBar.append({
html: '<button id="add-stock">StockIt!(<span id="stock-count">'+(stockList.urllist ? stockList.urllist.length : 0)+'</span>)</button>',
    width: 90,
    onReady: function(widget) {
        mainModel.statusBarAreas.push(widget);
        $("#add-stock", widget).click(function(){
            stockIt();
            notifyUpdate();
        });
    }
});

function removeStorage(url) {
    if (!stockList.urllist)
        return;
    var result = []
    for (var i=0; i < stockList.urllist.length; i++) {
        var item = stockList.urllist[i];
        if (item.url != url)
            result.push(item);
    }
    stockList.urllist = result;
}

jetpack.slideBar.append({
    onReady: function (slide) {
      mainModel.views.push(createSlideView(slide));
    },
    icon: SLIDEBAR_ICON,
    width: 270,
    persist: true,
    html: <>
        <style><![CDATA[
            body {
                font-family:      sans-serif;
                font-size:        9pt;
                overflow-x:         hidden;
                background-color: rgba(214, 221, 229, 1.0);
            }
            div.tab {
                background-color:   rgba(255, 255, 255, 0.3);
                position:           relative;
                padding:            6px;
                margin:             5px 0;
                    -moz-border-radius: 5px;
                cursor:             pointer;
            }
            div.tab.focused, div.tab.focusedClosing {
                background-color: rgba(255, 255, 255, 0.8);
                font-weight:      bold;
                margin-right:    -20px;
                padding-right:    24px;
            }
            div.tab:hover {
                background-color: rgba(255, 255, 255, 0.6);
            }
            div.tab.focused:hover, div.tab.focusedClosing:hover {
                background-color: rgba(255, 255, 255, 0.9);
            }
            div.tab:hover img.favicon,
            div.tab.focused img.favicon,
            div.tab.focusedClosing img.favicon {
                opacity: 1;
            }
            div.headerbar {
                height:        16px;
                clear:         both;
                margin-bottom: 10px;
            }
            img.favicon {
                width:   16px;
                height:  16px;
                opacity: 0.7;
                float:   left;
            }
            div.title {
                float: left;
                margin-left: 4px;
                line-height: 1.6em;
                height:      16px;
            }
            img.closeButton {
                margin-top: 1px;
                float:      right;
                display:    none;
            }
            div.tab:hover img.closeButton {
                display: block;
            }
            div.tab.focused:hover img.closeButton {
                right: 25px;
            }
            div.tab canvas.tabPreview {
                outline: 1px solid gray;
                width:   206px;
            }

            div.tab img.preview {
                outline: 1px solid gray;
                width:   206px;
                height:  100px;
            }
            #slideHeader .left {
                float: left;
                width: 150px;
            }
            #slideHeader .right {
                float: right;
                width: 50px;
            }
            #slideHeader .right button {
                margin-top: 15px;
            }
            #slideHeader .clear {
                clear: both;
            }
        ]]></style>
        <body>
        <div id="slideHeader">
          <div class="left">
            <h2>Stack URL List</h2>
          </div>
          <div class="right">
            <button id="clear-stock">clear</button>
          </div>
          <div class="clear"></div>
        </div>
        <div id="tabList"></div>
        </body>
        </>
});

// for trace method
//Tracer.wrap(this, ['stockIt', 'removeStorage'], notify);

// use this variable to know start to use LogWindow.
beforeStartup = false;

