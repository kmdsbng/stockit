// stockit v0.1
// Created by kmdsbng, yaotti
//
// stock pages to local storage

var manifest = {
    settings: [
        {id:"ratio", type:"range", label:"Ratio", min: 30, max: 100, default: 50 },
        {id:"thumbnails", type:"boolean", label:"Thumbnails?", default: true }
    ]
};

jetpack.future.import("storage.settings");
jetpack.future.import("storage.simple");

// global objects
var mainModel = {};
var stockList = jetpack.storage.simple;
var notify = function(msg) {jetpack.notifications.show(uneval(msg))};
var addSlide, clearSlide, notifyUpdate;

function stockIt() {
    if (!stockList.urllist) stockList.urllist = [];
    var exists = false;
    var url = jetpack.tabs.focused.url;
    stockList.urllist.forEach(function(st){
        exists = exists || (st.url == url);
    })
    if (exists) return;
    var title = $('title', jetpack.tabs.focused.contentDocument).text();
    if (title.length > 30) title = title.substr(0, 25) + "...";
    var stock = {url : url, title: title};
    stockList.urllist.push(stock);
    addSlide(jetpack.tabs.focused);
    notifyUpdate();
}



jetpack.future.import('menu');
jetpack.menu.context.page.add({
    label: 'StockIt',
    command: function () {
        stockIt();
    }
});

jetpack.statusBar.append({
html: '<button id="add-stock">StockIt!(<span id="stock-count">'+(stockList.urllist ? stockList.urllist.length : 0)+'</span>)</button>',
    width: 80,
    onReady: function(widget) {
        mainModel.statusBarArea = widget;
        $("#add-stock", widget).click(function(){
            stockIt();
            $("#stock-count", widget).text(stockList.urllist.length);
        });
        notifyUpdate = function() {
          $("#stock-count", widget).text(stockList.urllist.length);
        }
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

const SLIDEBAR_ICON = "http://github.com/kmdsbng/stockit/raw/master/img/stockit_icon.png";
const DEFAULT_FAVICON = "http://tb4.fr/labs/jetpack/thumbtabs/favicon.png";
const CLOSE_TAB_ICON = "http://tb4.fr/labs/jetpack/thumbtabs/close.png";
const NEW_TAB_ICON = "http://tb4.fr/labs/jetpack/thumbtabs/new_tab.png";
const PREF_ICON = "http://tb4.fr/labs/jetpack/thumbtabs/pref.png";


jetpack.future.import("slideBar");
jetpack.future.import("storage.settings");
jetpack.slideBar.append({
    onReady: function (slide) {
        mainModel.slideBarArea = slide.contentDocument.body;

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
            var index = findSlideItemByUrl(tab.url);
            if (index < 0)
              return;
            var slideItem = slideItems[index];
            var tabPreview = $("canvas", slideItem);
            var ctx = tabPreview[0].getContext("2d");
            ctx.drawWindow(tab.contentWindow, 0, 0, 500, 500, "white");
        }

        function makeSlideItem(tab) {
            return makeSlideItemInner(tab.url, getTabTitle(tab), tab);
        }

        function makeSlideItemByStorageItem(item) {
            var tab = findTabByUrl(item.url)
            if (tab)
                return makeSlideItem(tab);
            else
                return makeSlideItemInner(item.url, item.title);
        }

        function resumeSlideItemByStorageItem(item) {
            var tab = findTabByUrl(item.url)
            var slideItem = tab ? makeSlideItem(tab)
                                : makeSlideItemInner(item.url, item.title);
            addSlideItem(slideItem, tab);
        }

        function addSlideItem(item, tab) {
            slideItems.push(item);
            item.appendTo($("#tabList", slide.contentDocument.body));
            item.appendTo($("#tabList", slide.contentDocument.body)).fadeIn('normal');
            if (tab)
                updateTabPreview(tab);
        }

        function isURLOpened(url) {
            for (var i = 0; i < jetpack.tabs.length; i++)
                if (jetpack.tabs[i].url == url) return i
            return -1;
        }

        function findTabByUrl(url) {
            for (var i = 0; i < jetpack.tabs.length; i++)
                if (jetpack.tabs[i].url == url)
                    return jetpack.tabs[i];
            return null;
        }


        function makeSlideItemInner(url, titleText, tab) {
            var slideItem = $("<div />", slide.contentDocument.body);
            slideItem.attr('url', url);
            slideItem.addClass("tab");
            slideItem.click(function(event){
                var index = isURLOpened(url)
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
                removeStorage(url);
                removeSlideByURL(url);
                notifyUpdate();
            });
            headerBar.append(closeIcon);

            var tabPreview = slide.contentDocument.createElementNS("http://www.w3.org/1999/xhtml", "canvas");
            tabPreview.setAttribute("class", "tabPreview");
            slideItem.append(tabPreview);

            slideItem.mousedown(function (event) {
                if (!$(event.target).hasClass("closeButton"))
                    tab.focus();
            });
            return slideItem;
        }

        function removeSlideByURL(url) {
            var tabIndex = findSlideItemByUrl(url);
            if (tabIndex < 0)
                return;
            var slideItem = slideItems[tabIndex];
            if (slideItem.hasClass("focused")) {
                slideItem.addClass("focusedClosing");
            }
            slideItems.splice(tabIndex, 1);
            slideItem.remove()
        }

        function findSlideItemByUrl(url) {
            for (var i=0; i < slideItems.length; i++) {
                if (slideItems[i].attr('url') == url)
                    return i;
            }
            return -1;
        }

        addSlide = function onTabOpened(tab) {
            var slideItem = makeSlideItem(tab);
            addSlideItem(slideItem, tab);
        }

        var newTabImage = $("#newtab img", slide.contentDocument.body);
        newTabImage.attr("src", NEW_TAB_ICON);

        var slideItems = [];

        clearSlide = function() {
            for (var i = 0; i < slideItems.length; i++) {
                slideItems[i].remove();
            }
            slideItems = [];
        }
        $(slide.contentDocument).dblclick(function (event) {
            if (event.target.localName === "HTML")
                jetpack.tabs.open("about:blank").focus();
        });

        $("#newtab", slide.contentDocument.body).click(function (event) {
            jetpack.tabs.open("about:blank").focus();
        });

        $("#clear-stock", mainModel.slideBarArea).click(function(){
            stockList.urllist = [];
            clearSlide();
            $("#stock-count", mainModel.statusBarArea).text("0");
        });

        function resumeSlide() {
            for (var i=0; i < stockList.urllist.length; i++) {
                console.log(stockList.urllist[i].url);
                var item = stockList.urllist[i];
                var slideItem = resumeSlideItemByStorageItem(item);
            }
        }
        resumeSlide();
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
            #slideHeader .left {
                float: left;
                width: 170px;
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

