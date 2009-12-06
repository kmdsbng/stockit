// stockit v0.1
// Created by kmdsbng, yaotti
//
// stock pages to local storage

jetpack.future.import("storage.simple");

var stockList = jetpack.storage.simple;
var notify = function(msg) {jetpack.notifications.show(uneval(msg))};

var addSlide, clearSlide;

function stockIt() {
  if (!stockList.urllist) stockList.urllist = [];
  var exists = false;
  var url = jetpack.tabs.focused.url;
  stockList.urllist.forEach(function(st){
      exists = exists || (st.url == url);
  })
  if (exists) return;
  var stock = {
      url : url,
      title: $('title', jetpack.tabs.focused.contentDocument).text()
  };
  stockList.urllist.push(stock);
  addSlide(jetpack.tabs.focused);
}

jetpack.future.import('menu');
jetpack.menu.context.page.add({
  label: 'StockIt',
  command: function () {
             stockIt();
           }
});

jetpack.statusBar.append({
    html: "StockIt",
    width: 45,
    onReady: function(widget) {
        $(widget).click(function(){
          stockIt();
          /*
            if (!stockList.urllist) stockList.urllist = [];
            var exists = false;
            var url = jetpack.tabs.focused.url;
            stockList.urllist.forEach(function(st){
                exists = exists || (st.url == url);
            })
            if (exists) return;
            var stock = {
                url : url,
                title: $('title', jetpack.tabs.focused.contentDocument).text()
            };
            stockList.urllist.push(stock);
            addSlide(jetpack.tabs.focused);
            */
        });
    }
});

jetpack.statusBar.append({
    html: "clear",
    width: 45,
    onReady: function(widget) {
        $(widget).click(function(){
            stockList.urllist = [];
            clearSlide();
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

const SLIDEBAR_ICON = "http://tb4.fr/labs/jetpack/thumbtabs/icon.png";
const DEFAULT_FAVICON = "http://tb4.fr/labs/jetpack/thumbtabs/favicon.png";
const CLOSE_TAB_ICON = "http://tb4.fr/labs/jetpack/thumbtabs/close.png";
const NEW_TAB_ICON = "http://tb4.fr/labs/jetpack/thumbtabs/new_tab.png";
const PREF_ICON = "http://tb4.fr/labs/jetpack/thumbtabs/pref.png";

var manifest = {
    settings: [
        {id:"ratio", type:"range", label:"Ratio", min: 30, max: 100, default: 50 },
        {id:"thumbnails", type:"boolean", label:"Thumbnails?", default: true }
    ]
};

jetpack.future.import("slideBar");
jetpack.future.import("storage.settings");
jetpack.slideBar.append({
    onReady: function (slide) {

        function getTabIndex(tab) {
            return tabs.indexOf(tab);
        }


        function getTabFavicon(tab) {
            var favicon = tab.favicon || DEFAULT_FAVICON;
            return /^chrome:/.test(favicon) ? DEFAULT_FAVICON : favicon;
        }

        function getTabTitle(tab) {
            var tabTitle = tab.raw.label;
            if (tabTitle.length > 30) {
                tabTitle = tabTitle.substr(0, 25);
                tabTitle += "...";
            }
            return tabTitle;
        }

        function updateTabPreview(tab) {
            var tabWidget = tabWidgets[getTabIndex(tab)];
            var tabPreview = $("canvas", tabWidget);
            var ctx = tabPreview[0].getContext("2d");
            ctx.drawWindow(tab.contentWindow, 0, 0, 500, 500, "white");
        }

        function makeTabWidget(tab) {
          return makeTabWidgetInner(tab.url, getTabTitle(tab), tab);
        }

        function makeTabWidgetByStorageItem(item) {
          return makeTabWidgetInner(item.url, item.title);
        }

        function isURLOpened(url) {
            for (var i = 0; i < jetpack.tabs.length; i++)
                if (jetpack.tabs[i].url == url) return i
            return -1;
        }

        function makeTabWidgetInner(url, titleText, tab) {
            var tabWidget = $("<div />", slide.contentDocument.body);
            tabWidget.attr('url', url);
            tabWidget.addClass("tab");
            tabWidget.click(function(event){
                var index = isURLOpened(url)
                if (index >= 0) {
                    if (!$(event.target).hasClass("closeButton")) {
                        jetpack.tabs[index].focus();
                    }
                } else {
                  jetpack.tabs.open(url).focus();
                }
            })


            var headerBar = $("<div />", slide.contentDocument.body);
            headerBar.addClass("headerBar");
            tabWidget.append(headerBar);

            if (tab != null) {
              var favicon = $("<img />", slide.contentDocument.body);
              favicon.attr("src", getTabFavicon(tab));
              favicon.addClass("favicon");
              headerBar.append(favicon);
            }

            var title = $("<div />", slide.contentDocument.body);
            title.addClass("title");
            title.text(titleText);
            headerBar.append(title);

            var closeIcon = $("<img />", slide.contentDocument.body);
            closeIcon.attr("src", CLOSE_TAB_ICON);
            closeIcon.addClass("closeButton");
            closeIcon.click(function () {
                notify('close');
                removeStorage(url);
                notify('close2');
                removeSlideByURL(url);
                /*
                var index = isURLOpened(url);
                if (index >= 0)
                  removeSlide(tabs[index]);
                  */
            });
            headerBar.append(closeIcon);

            var tabPreview = slide.contentDocument.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
            tabPreview.setAttribute("class", "tabPreview");
            tabWidget.append(tabPreview);

            tabWidget.mousedown(function (event) {
                if (!$(event.target).hasClass("closeButton"))
                    tab.focus();
            });
            return tabWidget;
        }

        function onTabClosed(tab) {
            var tabIndex = getTabIndex(tab);
            var tabWidget = tabWidgets[tabIndex];
            if (tabWidget.hasClass("focused")) {
                tabWidget.addClass("focusedClosing");
            }
            tabWidgets.splice(tabIndex, 1);
            tabs.splice(tabIndex, 1);
            /*tabWidget.slideUp('normal').fadeOut('normal', function () tabWidget.remove());*/
            tabWidget.remove()
        }

        function removeSlide(tab) {
            var tabIndex = getTabIndex(tab);
            var tabWidget = tabWidgets[tabIndex];
            if (tabWidget.hasClass("focused")) {
                tabWidget.addClass("focusedClosing");
            }
            tabWidgets.splice(tabIndex, 1);
            tabs.splice(tabIndex, 1);
            tabWidget.remove()
        }


        function removeSlideByURL(url) {
            var tabIndex = findTabWidgetByUrl(url);
            if (tabIndex < 0)
              return;
            var tabWidget = tabWidgets[tabIndex];
            if (tabWidget.hasClass("focused")) {
                tabWidget.addClass("focusedClosing");
            }
            tabWidgets.splice(tabIndex, 1);
            //tabs.splice(tabIndex, 1);
            tabWidget.remove()
        }

        function findTabWidgetByUrl(url) {
          for (var i=0; i < tabWidgets.length; i++) {
            if (tabWidgets[i].attr('url') == url)
              return i;
          }
          return -1;
        }

        function onTabFocused(tab) {
            updateTabPreview(tab);
            $(".focused", slide.contentDocument.body).removeClass("focused");
            tabWidgets[getTabIndex(tab)].addClass("focused");
        }

        addSlide = function onTabOpened(tab) {
            var tabWidget = makeTabWidget(tab);
            tabWidgets.push(tabWidget);
            tabs.push(tab);
            tabWidget.appendTo($("#tabList", slide.contentDocument.body));
            tabWidget.appendTo($("#tabList", slide.contentDocument.body)).fadeIn('normal');
            /*$(slide.contentDocument.body).scrollTop(tabWidget.offset().top);*/
            updateTabPreview(tab);
        }

        function onTabReady(tab) {
            var tabWidget = tabWidgets[getTabIndex(tab)];
            $(".title", tabWidget).text(getTabTitle(tab));
            updateTabPreview(tab);
            setTimeout(function () {
                $(".favicon", tabWidget).attr("src", getTabFavicon(tab));
            }, 3000);
        }

        var newTabImage = $("#newtab img", slide.contentDocument.body);
        newTabImage.attr("src", NEW_TAB_ICON);

        var tabs = []
        var tabWidgets = [];

        clearSlide = function() {
            for (var i = 0; i < tabWidgets.length; i++) {
                tabWidgets[i].remove();
            }
            tabWidgets = [];
        }
        /*
    jetpack.tabs.forEach(function (tab) onTabOpened(tab));
    onTabFocused(jetpack.tabs.focused);
    */

        /*
    jetpack.tabs.onClose(function () onTabClosed(this));
    jetpack.tabs.onFocus(function () onTabFocused(this));
    jetpack.tabs.onOpen(function () onTabOpened(this));
    jetpack.tabs.onReady(function () onTabReady(this));
    */

        $(slide.contentDocument).dblclick(function (event) {
            if (event.target.localName === "HTML")
                jetpack.tabs.open("about:blank").focus();
        });

        $("#newtab", slide.contentDocument.body).click(function (event) {
            jetpack.tabs.open("about:blank").focus();
        });

        function resumeSlide() {
          for (var i=0; i < stockList.urllist.length; i++) {
            var item = stockList.urllist[i];
            var tabWidget = makeTabWidgetByStorageItem(item);
            tabWidgets.push(tabWidget);
            //tabs.push(tab);
            tabWidget.appendTo($("#tabList", slide.contentDocument.body));
            tabWidget.appendTo($("#tabList", slide.contentDocument.body)).fadeIn('normal');
            /*$(slide.contentDocument.body).scrollTop(tabWidget.offset().top);*/
            //updateTabPreview(tab);
          }
        }
        resumeSlide();
        //jetpack.tabs.forEach(function (tab) onTabOpened(tab));
    },
    icon: SLIDEBAR_ICON,
    width: 250,
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
        ]]></style>
        <body>
        <div id="tabList"></div>
        </body>
        </>
});

