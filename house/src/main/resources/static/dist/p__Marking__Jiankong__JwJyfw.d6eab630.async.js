(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[69],{CERv:function(e,a,t){"use strict";t.r(a);t("T2oS");var n,i,r=t("W9HT"),o=(t("+L6B"),t("2/Rp")),l=(t("Pwec"),t("CtXQ")),s=(t("IzEo"),t("bx4M")),d=(t("2qtc"),t("kLXV")),c=t("2Taf"),m=t.n(c),h=t("vZ4D"),u=t.n(h),g=t("MhPg"),p=t.n(g),y=t("l4Ni"),f=t.n(y),b=t("ujKo"),v=t.n(b),x=t("q1tI"),j=t.n(x),E=t("LLXN"),N=t("MuoO"),k=t("vDqi"),w=t.n(k),M=t("Qyje"),R=t.n(M),L=t("Aeqt"),F=t("mOP9"),J=t("tk3n"),D=t("/uJQ"),q=t.n(D),z=(t("ZZXH"),t("+WyL"),t("PTTD"),t("VyZj"));function I(e){var a=V();return function(){var t,n=v()(e);if(a){var i=v()(this).constructor;t=Reflect.construct(n,arguments,i)}else t=n.apply(this,arguments);return f()(this,t)}}function V(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}var S=(n=Object(N["connect"])(function(e){var a=e.jwleidajiankongModel,t=e.loading;return{loadingAll:t.models.jwleidajiankongModel,jwleidajiankongModel:a}}),n(i=function(e){p()(t,e);var a=I(t);function t(e){var n;return m()(this,t),n=a.call(this,e),n.state={type:"block",btNo:"",dbNo:"",mkName:"",dabiaolist:[],visible:!1,zcxx:[],corpName:""},n}return u()(t,[{key:"componentDidMount",value:function(){var e=this.props,a=e.dispatch,t=e.location,n=t.query,i=n.radarId,r=n.name,o=n.radarNo,l=n.version,s=n.iflag,d=n.type,c=n.insertDate,m=n.dataNum,h={examineName:r,radarId:i,iflag:s,radarNo:o,version:l,type:d,insertDate:c,dataNum:m};a({type:"jwleidajiankongModel/leidabianjishengcheng",payload:h}).then(function(e){a({type:"jwleidajiankongModel/searchfxxhzcbgxx",payload:h}),a({type:"jwleidajiankongModel/searchfxxhzcxx",payload:h}),a({type:"jwleidajiankongModel/searchdjg",payload:h})})}},{key:"dabiao",value:function(e,a,t,n){this.setState({dbNo:a,mkName:t,dabiaolist:[],radarVersion:n});var i=this.props.location,r=i.query,o=r.radarId,l=r.name,s=r.radarNo,d=this.state.visible,c={mkName:t,btNo:e,radarId:o,dbNo:a,examineName:l,radarNo:s,radarVersion:n},m=this;d||w.a.post("".concat(L["a"],"/radar/JwRadar/searchxinhao"),R.a.stringify(c)).then(function(e){m.setState({dabiaolist:e.data,type:"block",visible:!0})})}},{key:"clone",value:function(){this.setState({type:"none",visible:!1})}},{key:"ok",value:function(){this.setState({visible:!1}),this.shuaxin()}},{key:"shengchengBG",value:function(){for(var e=this,a=this.props,t=a.dispatch,n=a.jwleidajiankongModel.searchdjgList,i=[],r=0,o=0;o<n.length;o+=1)r=o+1,i.push({btNo:"3.3.".concat(r),dbNo:n[o].dbNo});var l=this.props.location,s=l.query,c=s.radarId,m=s.name,h=s.radarNo,u=s.version,g=s.iflag,p=s.type,y=s.insertDate,f=s.dataNum,b={btList:JSON.stringify(i),radarVersion:this.radarVersion1,examineName:m,radarId:c,iflag:g,radarNo:h,version:u,type:p,insertDate:y,dataNum:f};t({type:"jwleidajiankongModel/shengchengBG",payload:b}).then(function(a){a&&(0===a.code?(d["a"].success({title:a.msg}),e.shuaxin()):d["a"].error({title:a.msg}))})}},{key:"shuaxin",value:function(){var e=this.props,a=e.dispatch,t=e.location,n=t.query,i=n.radarId,r=n.name,o=n.radarNo,l=n.version,s=n.iflag,d=n.type,c=n.insertDate,m=n.dataNum,h={examineName:r,radarId:i,iflag:s,radarNo:o,version:l,type:d,insertDate:c,dataNum:m};a({type:"jwleidajiankongModel/searchfxxhzcbgxx",payload:h}),a({type:"jwleidajiankongModel/searchfxxhzcxx",payload:h}),a({type:"jwleidajiankongModel/searchdjg",payload:h})}},{key:"render",value:function(){var e=this,a=this.props,t=a.jwleidajiankongModel,n=t.searchfxxhzcbgxxList,i=t.searchfxxhzcxxList,d=t.searchdjgList,c=a.loadingAll,m=a.location,h=m.query,u=h.name,g=h.version,p=h.radarId,y=h.sysCode,f=h.radarNo,b=h.current,v=h.size,x=h.examineName,N=h.effective,k=h.total,w=h.dbState,M=[],R=0,L=[],D="",I=this.state,V=I.type,S=I.btNo,C=I.dbNo,T=I.mkName,A=I.dabiaolist,O=I.visible,P=I.corpName,B=I.riskLevel,X=I.radarVersion,Z={btNo:S,mkName:T,dbNo:C,name:u,sysCode:y,dabiaolist:A,version:g,visible:O,corpName:P,radarId:p,riskLevel:B,radarVersion:X,radarNo:f},G=[];if(void 0!==i&&null!==i&&i.length>0&&(this.radarVersion1=i[0].radarVersion,G.push(j.a.createElement(s["a"],{title:Object(E["formatMessage"])({id:"jindiao.JwRiskReport.zhucexinxibt"}),style:{minHeight:200,width:"100%",float:"right",marginTop:"2%"},bordered:!0},"2.1 \u68c0\u7d22\u5bf9\u8c61\uff1a".concat(i[0].corpName),j.a.createElement("div",{style:{height:"10px"}}),j.a.createElement("span",{style:{marginLeft:25}}),j.a.createElement(E["FormattedMessage"],{id:"jindiao.JwRiskReport.shujulaiyuan"}),j.a.createElement(E["FormattedMessage"],{id:"common.datasources1"}),j.a.createElement("div",{style:{height:"18px"}}),j.a.createElement(z["a"],{dataList:i[0],index:2.1,pageType:"jyfw",num:"2.1"})))),void 0!==n&&n.length>0?n.forEach(function(e){M.push(j.a.createElement("tr",null,j.a.createElement("td",null," ",e.projectName," "),j.a.createElement("td",null," ",e.changeDate),j.a.createElement("td",null,e.beforeContent),j.a.createElement("td",null,e.afterContent)))}):M.push(j.a.createElement("tr",null,j.a.createElement("td",{colSpan:4},j.a.createElement(E["FormattedMessage"],{id:"jindiao.JwRiskReport.notselectxinxi"})))),void 0!==d&&d.length>0){D=d[0].radarState;for(var H=0;H<d.length;H+=1)this.radarVersion1=d[0].radarVersion,R=H+1,L.push(j.a.createElement("div",null,"3.3.".concat(R),"\xa0\xa0","\u68c0\u7d22\u5bf9\u8c61\uff1a".concat(d[H].corpName),j.a.createElement("div",{style:{height:"10px"}}),j.a.createElement("span",{style:{marginLeft:38}},j.a.createElement(E["FormattedMessage"],{id:"jindiao.JwRiskReport.shujulaiyuan"}),j.a.createElement(E["FormattedMessage"],{id:"common.datasources1"})),j.a.createElement("div",{style:{height:"18px"}}),j.a.createElement(z["a"],{dataList:d[H],dabiao:function(a,t,n,i){e.dabiao(a,t,n,i)},index:R,pageType:"jyfw",num:"3.3"})))}return j.a.createElement("div",null,j.a.createElement(r["a"],{spinning:c},j.a.createElement(s["a"],{title:"\u7ecf\u8425\u8303\u56f4\u53d8\u66f4",extra:j.a.createElement("div",{style:{float:"right"}},j.a.createElement(F["a"],{to:{pathname:"/marking/jiankong",query:{current:b,size:v,examineName:x,effective:N,total:k}}},j.a.createElement(o["a"],null,j.a.createElement(l["a"],{type:"left"}),"\u8fd4\u56de"," ")),j.a.createElement(o["a"],{loading:c,onClick:this.shengchengBG.bind(this),type:"primary",disabled:"0"!=w,style:{backgroundColor:"0"==w?"#3D73FE":"#A7A7A7",color:"0"==w?"white":"#FFFFFF",marginLeft:"20px"}},"\u63d0\u4ea4")),bordered:!0,className:q.a.cardList},j.a.createElement("div",{className:q.a.tableList},j.a.createElement("table",null,j.a.createElement("thead",null,j.a.createElement("tr",null,j.a.createElement("th",{style:{width:"12.5%"}},j.a.createElement(E["FormattedMessage"],{id:"jindiao.JwRiskReport.shenchaxiangmu"})),j.a.createElement("th",{style:{width:"12.5%"}},j.a.createElement(E["FormattedMessage"],{id:"jindiao.JwRiskReport.biangengriqi"})),j.a.createElement("th",{style:{width:"40%"}},j.a.createElement(E["FormattedMessage"],{id:"jindiao.JwRiskReport.biangengqian"})),j.a.createElement("th",{style:{width:"35%"}},j.a.createElement(E["FormattedMessage"],{id:"jindiao.JwRiskReport.biangenghou"}))),M)))),i.length>0?G:null,d.length>0?j.a.createElement(s["a"],{title:Object(E["formatMessage"])({id:"jindiao.JwRiskReport.qiyeguanliangongsixinxibt"})+("1"===D?"\uff08\u65b0\u589e\uff09":"\uff08\u53d8\u66f4\uff09"),style:{marginTop:"2%"},className:q.a.cardList,bordered:!0},j.a.createElement("div",null,j.a.createElement("div",{style:{color:"rgba(0, 0, 0, 0.85)",fontSize:"16px",marginBottom:15}},j.a.createElement(E["FormattedMessage"],{id:"jindiao.JwRiskReport.gerengudong"})),L,j.a.createElement("br",null))):null,O?j.a.createElement(J["a"],{ok:this.ok.bind(this),clone:this.clone.bind(this),iflag:"J",canshu:"1",type:V,values:Z}):null))}}]),t}(x["PureComponent"]))||i);a["default"]=S}}]);