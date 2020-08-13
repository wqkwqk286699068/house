//window.onerror=function(e){console.error(e);return true;}
window.zhuge = window.zhuge || [];window.zhuge.methods = "_init debug identify track trackLink trackForm page".split(" ");
window.zhuge.factory = function(b) {return function() {var a = Array.prototype.slice.call(arguments);a.unshift(b);
    window.zhuge.push(a);return window.zhuge;}};for (var i = 0; i < window.zhuge.methods.length; i++) {
    var key = window.zhuge.methods[i];window.zhuge[key] = window.zhuge.factory(key);}window.zhuge.load = function(b, x) {
    if (!document.getElementById("zhuge-js")) {var a = document.createElement("script");var verDate = new Date();
        var verStr = verDate.getFullYear().toString()+ verDate.getMonth().toString() + verDate.getDate().toString();
        a.type = "text/javascript";a.id = "zhuge-js";a.async = !0;a.src = (location.protocol == 'http:' ? "http://tongji.qichacha.com/zhuge.js" : 'https://tongji.qichacha.com/zhuge.js');
        a.onerror = function(){window.zhuge.identify = window.zhuge.track = function(ename, props, callback){if(callback && Object.prototype.toString.call(callback) === '[object Function]')callback();};};
        var c = document.getElementsByTagName("script")[0];c.parentNode.insertBefore(a, c);window.zhuge._init(b, x)}};
window.zhuge.load('de1d1a35bfa24ce29bbf2c7eb17e6c4f',{
    visualizer: true,
    autoTrack:false
});
function zhugeTrack(event,config){
    try{
        if(config){
            window.zhuge.track(event,config);
        }else{
            window.zhuge.track(event);
        }
    }catch(e){
        console.info(e);
    }
    
}

