(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[64],{"+Av8":function(e,a,t){"use strict";t.r(a);t("T2oS");var n,i,r=t("W9HT"),o=(t("IzEo"),t("bx4M")),l=(t("+L6B"),t("2/Rp")),s=(t("Pwec"),t("CtXQ")),d=t("2Taf"),c=t.n(d),m=t("vZ4D"),u=t.n(m),h=t("MhPg"),p=t.n(h),g=t("l4Ni"),f=t.n(g),y=t("ujKo"),v=t.n(y),E=t("q1tI"),b=t.n(E),N=t("MuoO"),k=t("LLXN"),j=t("vDqi"),w=t.n(j),x=t("Qyje"),R=t.n(x),M=t("Aeqt"),L=t("mOP9"),J=t("GT59"),T=(t("ZZXH"),t("+WyL"),t("PTTD"),t("/uJQ")),z=t.n(T),D=t("VyZj");function V(e){var a=q();return function(){var t,n=v()(e);if(a){var i=v()(this).constructor;t=Reflect.construct(n,arguments,i)}else t=n.apply(this,arguments);return f()(this,t)}}function q(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}var F=(n=Object(N["connect"])(function(e){var a=e.jwleidajiankongModel,t=e.loading;return{loadingAll:t.models.jwleidajiankongModel,jwleidajiankongModel:a}}),n(i=function(e){p()(t,e);var a=V(t);function t(e){var n;return c()(this,t),n=a.call(this,e),n.state={type:"block",btNo:"",dbNo:"",mkName:"",dabiaolist:[],visible:!1,corpName:"",radarVersion:""},n}return u()(t,[{key:"componentDidMount",value:function(){var e=this.props,a=e.dispatch,t=e.location,n=t.query,i=n.radarId,r=n.name,o=n.radarNo,l=n.version,s=n.iflag,d=n.type,c=n.insertDate,m=n.dataNum,u={examineName:r,radarId:i,iflag:s,radarNo:o,version:l,type:d,insertDate:c,dataNum:m};a({type:"jwleidajiankongModel/leidabianjishengcheng",payload:u}).then(function(e){a({type:"jwleidajiankongModel/searchfxxhzcbgxx",payload:u}),a({type:"jwleidajiankongModel/searchgd",payload:u}),a({type:"jwleidajiankongModel/searchdwtz",payload:u})})}},{key:"dabiao",value:function(e,a,t,n){this.setState({dbNo:a,mkName:t,dabiaolist:[],radarVersion:n});var i=this.props.location,r=i.query,o=r.radarId,l=r.name,s=r.radarNo,d=this.state.visible,c={mkName:t,btNo:e,radarId:o,dbNo:a,examineName:l,radarNo:s,radarVersion:n},m=this;d||w.a.post("".concat(M["a"],"/radar/JwRadar/searchxinhao"),R.a.stringify(c)).then(function(e){m.setState({dabiaolist:e.data,type:"block",visible:!0})})}},{key:"clone",value:function(){this.setState({type:"none",visible:!1})}},{key:"ok",value:function(){this.setState({visible:!1}),this.shuaxin()}},{key:"render",value:function(){var e=this,a=this.props,t=a.jwleidajiankongModel,n=t.searchfxxhzcbgxxList,i=t.searchgdList,d=t.searchdwtzList,c=a.loadingAll,m=a.location,u=m.query,h=u.name,p=u.version,g=u.radarId,f=u.sysCode,y=u.radarNo,v=u.changeWay,E=u.current,N=u.size,j=u.examineName,w=u.effective,x=u.total,R=[],M=0,T=this.state,V=T.type,q=T.btNo,F=T.dbNo,I=T.mkName,S=T.dabiaolist,C=T.visible,P=T.corpName,O=T.riskLevel,A=T.radarVersion,Z={btNo:q,mkName:I,dbNo:F,name:h,sysCode:f,dabiaolist:S,version:p,visible:C,corpName:P,radarId:g,riskLevel:O,radarVersion:A,radarNo:y},Q=[],W=[],X="";if(void 0!==n&&n.length>0?n.forEach(function(e){R.push(b.a.createElement("tr",null,b.a.createElement("td",null," ",e.projectName," "),b.a.createElement("td",null," ",e.changeDate),b.a.createElement("td",null,e.beforeContent),b.a.createElement("td",null,e.afterContent)))}):R.push(b.a.createElement("tr",null,b.a.createElement("td",{colSpan:4},b.a.createElement(k["FormattedMessage"],{id:"jindiao.JwRiskReport.notselectxinxi"})))),void 0!==i&&i.length>0&&i.forEach(function(a,t){M=t+1,e.radarVersion1=a.radarVersion,Q.push(b.a.createElement("div",null,"3.1.".concat(M),"\xa0\xa0","\u68c0\u7d22\u5bf9\u8c61\uff1a".concat(i[t].corpName),b.a.createElement("div",{style:{height:"10px"}}),b.a.createElement("span",{style:{marginLeft:38}},b.a.createElement(k["FormattedMessage"],{id:"jindiao.JwRiskReport.shujulaiyuan"}),b.a.createElement(k["FormattedMessage"],{id:"common.datasources1"})),b.a.createElement("div",{style:{height:"18px"}}),b.a.createElement(D["a"],{dataList:i[t],dabiao:function(a,t,n,i){e.dabiao(a,t,n,i)},index:M,pageType:"dwtz",num:"3.1"})))}),void 0!==d&&d.length>0){X=d[0].radarState;for(var H=0;H<d.length;H++)M=H+1,this.radarVersion1=d[0].radarVersion,W.push(b.a.createElement("div",null,"3.2.".concat(M),"\xa0\xa0","\u68c0\u7d22\u5bf9\u8c61\uff1a".concat(d[H].corpName),b.a.createElement("div",{style:{height:"10px"}}),b.a.createElement("span",{style:{marginLeft:38}},b.a.createElement(k["FormattedMessage"],{id:"jindiao.JwRiskReport.shujulaiyuan"}),b.a.createElement(k["FormattedMessage"],{id:"common.datasources1"})),b.a.createElement("div",{style:{height:"18px"}}),b.a.createElement(D["a"],{dataList:d[H],dabiao:function(a,t,n,i){e.dabiao(a,t,n,i)},index:M,pageType:"dwtz",num:"3.2"})))}return b.a.createElement("div",null,b.a.createElement(r["a"],{spinning:c},b.a.createElement(o["a"],{title:1==v?"\u5bf9\u5916\u6295\u8d44\u65b0\u589e":2==v?"\u5bf9\u5916\u6295\u8d44\u5220\u9664":"\u5bf9\u5916\u6295\u8d44\u53d8\u66f4",extra:b.a.createElement("div",{style:{float:"right"}},b.a.createElement(L["a"],{to:{pathname:"/marking/jiankong",query:{current:E,size:N,examineName:j,effective:w,total:x}}},b.a.createElement(l["a"],null,b.a.createElement(s["a"],{type:"left"}),"\u8fd4\u56de"))),className:z.a.cardList,bordered:!0},b.a.createElement("div",{className:z.a.tableList},b.a.createElement("table",null,b.a.createElement("thead",null,b.a.createElement("tr",null,b.a.createElement("th",{style:{width:"12.5%"}},b.a.createElement(k["FormattedMessage"],{id:"jindiao.JwRiskReport.shenchaxiangmu"})),b.a.createElement("th",{style:{width:"12.5%"}},b.a.createElement(k["FormattedMessage"],{id:"jindiao.JwRiskReport.biangengriqi"})),b.a.createElement("th",{style:{width:"40%"}},b.a.createElement(k["FormattedMessage"],{id:"jindiao.JwRiskReport.biangengqian"})),b.a.createElement("th",{style:{width:"35%"}},b.a.createElement(k["FormattedMessage"],{id:"jindiao.JwRiskReport.biangenghou"}))),R)))),i.length>0?b.a.createElement(o["a"],{title:Object(k["formatMessage"])({id:"jindiao.JwRiskReport.gudonglian"}),style:{marginTop:"2%"},bordered:!0,className:z.a.cardList},b.a.createElement("div",null,Q)):2!=v?b.a.createElement(o["a"],{title:" 3.1\uff08\u6682\u65e0\u6570\u636e\uff09",style:{marginTop:"2%"},className:z.a.cardList,bordered:!0}):null,d.length>0?b.a.createElement(o["a"],{title:Object(k["formatMessage"])({id:"jindiao.JwRiskReport.zigongsi"})+(null===X?"":"1"===X?"\uff08\u65b0\u589e\uff09":"\uff08\u53d8\u66f4\uff09"),style:{marginTop:"2%"},className:z.a.cardList,bordered:!0},b.a.createElement("div",null,W)):null,C?b.a.createElement(J["a"],{ok:this.ok.bind(this),clone:this.clone.bind(this),iflag:"D",canshu:"1",type:V,values:Z}):null))}}]),t}(E["PureComponent"]))||i);a["default"]=F}}]);