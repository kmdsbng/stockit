// stockit v0.1
// Created by kmdsbng, yaotti
//
// stock pages to local storage

jetpack.future.import("storage.simple");

var stockList = jetpack.storage.simple;
var notify = function(msg) {jetpack.notifications.show(uneval(msg))};

jetpack.statusBar.append({
    html: "StockIt",
    width: 45,
    onReady: function(widget) {
        $(widget).click(function(){
            if (!stockList.urllist) stockList.urllist = [];
            var exists = false;
            var url = jetpack.tabs.focused.url;
            stockList.urllist.forEach(function(st){
                exists = exists || (st.url == url);
            })
            notify(stockList.urllist);
            if (exists) return;
            var stock = {
                url : url,
                title: $('title', jetpack.tabs.focused.contentDocument).text()
            };
            stockList.urllist.push(stock);
        });
    }
});

