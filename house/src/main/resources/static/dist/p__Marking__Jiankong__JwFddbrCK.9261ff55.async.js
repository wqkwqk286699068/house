(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[66],{"/sH+":function(e,a,t){"use strict";t.r(a);t("T2oS");var n,i,r=t("W9HT"),o=(t("+L6B"),t("2/Rp")),l=(t("Pwec"),t("CtXQ")),s=(t("IzEo"),t("bx4M")),d=t("2Taf"),c=t.n(d),m=t("vZ4D"),u=t.n(m),h=t("MhPg"),p=t.n(h),g=t("l4Ni"),f=t.n(g),y=t("ujKo"),b=t.n(y),v=t("q1tI"),E=t.n(v),j=t("LLXN"),k=t("MuoO"),x=t("vDqi"),N=t.n(x),w=t("Qyje"),R=t.n(w),M=t("Aeqt"),L=t("mOP9"),J=t("GT59"),T=(t("ZZXH"),t("+WyL"),t("PTTD"),t("/uJQ")),F=t.n(T),V=t("VyZj");function q(e){var a=z();return function(){var t,n=b()(e);if(a){var i=b()(this).constructor;t=Reflect.construct(n,arguments,i)}else t=n.apply(this,arguments);return f()(this,t)}}function z(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}var D=(n=Object(k["connect"])(function(e){var a=e.jwleidajiankongModel,t=e.loading;return{loadingAll:t.models.jwleidajiankongModel,jwleidajiankongModel:a}}),n(i=function(e){p()(t,e);var a=q(t);function t(e){var n;return c()(this,t),n=a.call(this,e),n.state={type:"block",btNo:"",dbNo:"",mkName:"",dabiaolist:[],visible:!1,zcxx:{},corpName:"",riskLevel:"",radarVersion:"",spinning:!1},n}return u()(t,[{key:"componentDidMount",value:function(){var e=this.props,a=e.dispatch,t=e.location,n=t.query,i=n.radarId,r=n.name,o=n.radarNo,l=n.version,s=n.iflag,d=n.type,c=n.insertDate,m=n.dataNum,u={examineName:r,radarId:i,iflag:s,radarNo:o,version:l,type:d,insertDate:c,dataNum:m};a({type:"jwleidajiankongModel/leidabianjishengcheng",payload:u}).then(function(e){a({type:"jwleidajiankongModel/searchfxxhzcbgxx",payload:u}),a({type:"jwleidajiankongModel/searchfxxhzcxx",payload:u}),a({type:"jwleidajiankongModel/searchdjg",payload:u})})}},{key:"dabiao",value:function(e,a,t,n){this.setState({dbNo:a,mkName:t,dabiaolist:[],radarVersion:n});var i=this.props.location,r=i.query,o=r.radarId,l=r.name,s=r.radarNo,d=this.state.visible,c={mkName:t,btNo:e,radarId:o,dbNo:a,examineName:l,radarNo:s,radarVersion:n},m=this;d||N.a.post("".concat(M["a"],"/radar/JwRadar/searchxinhao"),R.a.stringify(c)).then(function(e){m.setState({dabiaolist:e.data,type:"block",visible:!0})})}},{key:"clone",value:function(){this.setState({type:"none",visible:!1})}},{key:"ok",value:function(){this.setState({visible:!1}),this.shuaxin()}},{key:"render",value:function(){var e=this,a=this.props,t=a.jwleidajiankongModel,n=t.searchfxxhzcbgxxList,i=t.searchfxxhzcxxList,d=t.searchdjgList,c=a.loadingAll,m=a.location,u=m.query,h=u.name,p=u.version,g=u.radarId,f=u.sysCode,y=u.radarNo,b=u.changeWay,v=u.current,k=u.size,x=u.examineName,N=u.effective,w=u.total,R=[],M=0,T=this.state,q=T.type,z=T.btNo,D=T.dbNo,I=T.mkName,S=T.dabiaolist,C=T.visible,P=T.corpName,O=T.radarVersion,H=T.riskLevel,Z={btNo:z,mkName:I,dbNo:D,name:h,sysCode:f,dabiaolist:S,version:p,visible:C,corpName:P,radarId:g,riskLevel:H,radarVersion:O,radarNo:y},A=[],Q=[];if(void 0!==i&&null!==i&&i.length>0&&(this.radarVersion1=i[0].radarVersion,Q.push(E.a.createElement(s["a"],{title:Object(j["formatMessage"])({id:"jindiao.JwRiskReport.zhucexinxibt"}),style:{minHeight:200,width:"100%",float:"right",marginTop:"2%"},bordered:!0},"2.1 \u68c0\u7d22\u5bf9\u8c61\uff1a".concat(i[0].corpName),E.a.createElement("div",{style:{height:"10px"}}),E.a.createElement("span",{style:{marginLeft:25}}),E.a.createElement(j["FormattedMessage"],{id:"jindiao.JwRiskReport.shujulaiyuan"}),E.a.createElement(j["FormattedMessage"],{id:"common.datasources1"}),E.a.createElement("div",{style:{height:"18px"}}),E.a.createElement(V["a"],{dataList:i[0],index:2.1,pageType:"jyfw",num:"2.1"})))),void 0!==n&&n.length>0?n.forEach(function(e){R.push(E.a.createElement("tr",null,E.a.createElement("td",null," ",e.projectName," "),E.a.createElement("td",null," ",e.changeDate),E.a.createElement("td",null,e.beforeContent),E.a.createElement("td",null,e.afterContent)))}):R.push(E.a.createElement("tr",null,E.a.createElement("td",{colSpan:4},E.a.createElement(j["FormattedMessage"],{id:"jindiao.JwRiskReport.notselectxinxi"})))),void 0!==d&&d.length>0&&d.length>0){d[0].radarState;for(var W=0;W<d.length;W+=1)this.radarVersion1=d[0].radarVersion,M=W+1,A.push(E.a.createElement("div",null,"3.3.".concat(M),"\xa0\xa0","\u68c0\u7d22\u5bf9\u8c61\uff1a".concat(d[W].corpName),E.a.createElement("div",{style:{height:"10px"}}),E.a.createElement("span",{style:{marginLeft:38}},E.a.createElement(j["FormattedMessage"],{id:"jindiao.JwRiskReport.shujulaiyuan"}),E.a.createElement(j["FormattedMessage"],{id:"common.datasources1"})),E.a.createElement("div",{style:{height:"18px"}}),E.a.createElement(V["a"],{dataList:d[W],dabiao:function(a,t,n,i){e.dabiao(a,t,n,i)},index:M,pageType:"fddbr",num:"3.3"})))}return E.a.createElement("div",null,E.a.createElement(r["a"],{spinning:c},E.a.createElement(s["a"],{title:Object(j["formatMessage"])({id:"jindiao.JwRiskReport.fddbrbg"}),extra:E.a.createElement("div",{style:{float:"right"}},E.a.createElement(L["a"],{to:{pathname:"/marking/jiankong",query:{current:v,size:k,examineName:x,effective:N,total:w}}},E.a.createElement(o["a"],null,E.a.createElement(l["a"],{type:"left"}),"\u8fd4\u56de"))),className:F.a.cardList,bordered:!0},E.a.createElement("div",{className:F.a.tableList},E.a.createElement("table",null,E.a.createElement("thead",null,E.a.createElement("tr",null,E.a.createElement("th",{style:{width:"12.5%"}},E.a.createElement(j["FormattedMessage"],{id:"jindiao.JwRiskReport.shenchaxiangmu"})),E.a.createElement("th",{style:{width:"12.5%"}},E.a.createElement(j["FormattedMessage"],{id:"jindiao.JwRiskReport.biangengriqi"})),E.a.createElement("th",{style:{width:"40%"}},E.a.createElement(j["FormattedMessage"],{id:"jindiao.JwRiskReport.biangengqian"})),E.a.createElement("th",{style:{width:"35%"}},E.a.createElement(j["FormattedMessage"],{id:"jindiao.JwRiskReport.biangenghou"}))),R)))),i.length>0?Q:null,d.length>0?E.a.createElement(s["a"],{title:1==b?"3.3 \u4e2a\u4eba\u80a1\u4e1c/\u6cd5\u5b9a\u4ee3\u8868\u4eba/\u8463\u9ad8\u76d1\u5bf9\u5916\u6295\u8d44\u516c\u53f8\uff08\u65b0\u589e\uff09":"3.3 \u4e2a\u4eba\u80a1\u4e1c/\u6cd5\u5b9a\u4ee3\u8868\u4eba/\u8463\u9ad8\u76d1\u5bf9\u5916\u6295\u8d44\u516c\u53f8\uff08\u53d8\u66f4\uff09",style:{marginTop:"2%"},bordered:!0,className:F.a.cardList},E.a.createElement("div",null,A)):E.a.createElement(s["a"],{title:"3.3 \uff08\u6682\u65e0\u6570\u636e\uff09",style:{marginTop:"2%"},className:F.a.cardList,bordered:!0}),C?E.a.createElement(J["a"],{ok:this.ok.bind(this),clone:this.clone.bind(this),iflag:"F",canshu:"1",type:q,values:Z}):null))}}]),t}(v["PureComponent"]))||i);a["default"]=D}}]);