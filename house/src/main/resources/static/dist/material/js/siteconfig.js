var Duohuo ={};
INDEX_URL=""; 
INDEX_URL_A=""; 
INDEX_ROOT="";
CMS_STYLE_ROOT="/material/theme/chacha/cms";
PLUGINS_ROOT="/material/plugins";
var domainStr = window.location.host;
var domainArr = domainStr.split('.');
var subDomain = domainArr[0];
if(subDomain === 'pinpai'){
    INDEX_URL_A = 'https://www.qichacha.com';
}