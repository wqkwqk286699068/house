(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[38],{"9nVL":function(e,t,a){e.exports={linkGroup:"antd-pro-components-editable-link-group-index-linkGroup"}},"t/hC":function(e,t,a){"use strict";a.r(t);a("14J3");var r=a("BMrR"),n=(a("jCWc"),a("kPKH")),c=(a("IzEo"),a("bx4M")),o=(a("Mwp2"),a("VXEj")),i=(a("Telt"),a("Tckk")),l=a("2Taf"),s=a.n(l),d=a("vZ4D"),p=a.n(d),m=a("MhPg"),u=a.n(m),f=a("l4Ni"),h=a.n(f),v=a("ujKo"),E=a.n(v),g=a("q1tI"),k=a.n(g),b=a("wd/R"),y=a.n(b),w=a("MuoO"),N=a("mOP9"),j=a("KTCi"),C=(a("+L6B"),a("2/Rp")),L=(a("17x9"),a("9nVL")),x=a.n(L);function R(e){var t=I();return function(){var a,r=E()(e);if(t){var n=E()(this).constructor;a=Reflect.construct(r,arguments,n)}else a=r.apply(this,arguments);return h()(this,a)}}function I(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}var T=function(e){u()(a,e);var t=R(a);function a(){return s()(this,a),t.apply(this,arguments)}return p()(a,[{key:"render",value:function(){var e=this.props,t=e.links,a=e.linkElement,r=e.onAdd;return k.a.createElement("div",{className:x.a.linkGroup},t.map(function(e){return Object(g["createElement"])(a,{key:"linkGroup-item-".concat(e.id||e.title),to:e.href,href:e.href},e.title)}),k.a.createElement(C["a"],{size:"small",type:"primary",ghost:!0,onClick:r,icon:"plus"},"\u6dfb\u52a0"))}}]),a}(g["PureComponent"]);T.defaultProps={links:[],onAdd:function(){},linkElement:"a"};var A,z,G=T,M=a("zHco"),P=a("wnz0"),D=a.n(P);function S(e){var t=B();return function(){var a,r=E()(e);if(t){var n=E()(this).constructor;a=Reflect.construct(r,arguments,n)}else a=r.apply(this,arguments);return h()(this,a)}}function B(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}var U=[{title:"\u64cd\u4f5c\u4e00",href:""},{title:"\u64cd\u4f5c\u4e8c",href:""},{title:"\u64cd\u4f5c\u4e09",href:""},{title:"\u64cd\u4f5c\u56db",href:""},{title:"\u64cd\u4f5c\u4e94",href:""},{title:"\u64cd\u4f5c\u516d",href:""}],H=(A=Object(w["connect"])(function(e){var t=e.user,a=e.project,r=e.activities,n=e.chart,c=e.loading;return{currentUser:t.currentUser,project:a,activities:r,chart:n,currentUserLoading:c.effects["user/fetchCurrent"],projectLoading:c.effects["project/fetchNotice"],activitiesLoading:c.effects["activities/fetchList"]}}),A(z=function(e){u()(a,e);var t=S(a);function a(){return s()(this,a),t.apply(this,arguments)}return p()(a,[{key:"componentDidMount",value:function(){var e=this.props.dispatch;e({type:"user/fetchCurrent"}),e({type:"project/fetchNotice"}),e({type:"activities/fetchList"}),e({type:"chart/fetch"})}},{key:"componentWillUnmount",value:function(){var e=this.props.dispatch;e({type:"chart/clear"})}},{key:"renderActivities",value:function(){var e=this.props.activities.list;return e.map(function(e){var t=e.template.split(/@\{([^{}]*)\}/gi).map(function(t){return e[t]?k.a.createElement("a",{href:e[t].link,key:e[t].name},e[t].name):t});return k.a.createElement(o["a"].Item,{key:e.id},k.a.createElement(o["a"].Item.Meta,{avatar:k.a.createElement(i["a"],{src:e.user.avatar}),title:k.a.createElement("span",null,k.a.createElement("a",{className:D.a.username},e.user.name),"\xa0",k.a.createElement("span",{className:D.a.event},t)),description:k.a.createElement("span",{className:D.a.datetime,title:e.updatedAt},y()(e.updatedAt).fromNow())}))})}},{key:"render",value:function(){var e=this.props,t=e.currentUser,a=e.currentUserLoading,l=e.project.notice,s=e.projectLoading,d=e.activitiesLoading,p=e.chart.radarData,m=t&&Object.keys(t).length?k.a.createElement("div",{className:D.a.pageHeaderContent},k.a.createElement("div",{className:D.a.avatar},k.a.createElement(i["a"],{size:"large",src:t.avatar})),k.a.createElement("div",{className:D.a.content},k.a.createElement("div",{className:D.a.contentTitle},"\u65e9\u5b89\uff0c",t.name,"\uff0c\u795d\u4f60\u5f00\u5fc3\u6bcf\u4e00\u5929\uff01"),k.a.createElement("div",null,t.title," |",t.group))):null,u=k.a.createElement("div",{className:D.a.extraContent},k.a.createElement("div",{className:D.a.statItem},k.a.createElement("p",null,"\u9879\u76ee\u6570"),k.a.createElement("p",null,"56")),k.a.createElement("div",{className:D.a.statItem},k.a.createElement("p",null,"\u56e2\u961f\u5185\u6392\u540d"),k.a.createElement("p",null,"8",k.a.createElement("span",null," / 24"))),k.a.createElement("div",{className:D.a.statItem},k.a.createElement("p",null,"\u9879\u76ee\u8bbf\u95ee"),k.a.createElement("p",null,"2,223")));return k.a.createElement(M["a"],{loading:a,content:m,extraContent:u},k.a.createElement(r["a"],{gutter:24},k.a.createElement(n["a"],{xl:16,lg:24,md:24,sm:24,xs:24},k.a.createElement(c["a"],{className:D.a.projectList,style:{marginBottom:24},title:"\u8fdb\u884c\u4e2d\u7684\u9879\u76ee",bordered:!1,extra:k.a.createElement(N["a"],{to:"/"},"\u5168\u90e8\u9879\u76ee"),loading:s,bodyStyle:{padding:0}},l.map(function(e){return k.a.createElement(c["a"].Grid,{className:D.a.projectGrid,key:e.id},k.a.createElement(c["a"],{bodyStyle:{padding:0},bordered:!1},k.a.createElement(c["a"].Meta,{title:k.a.createElement("div",{className:D.a.cardTitle},k.a.createElement(i["a"],{size:"small",src:e.logo}),k.a.createElement(N["a"],{to:e.href},e.title)),description:e.description}),k.a.createElement("div",{className:D.a.projectItemContent},k.a.createElement(N["a"],{to:e.memberLink},e.member||""),e.updatedAt&&k.a.createElement("span",{className:D.a.datetime,title:e.updatedAt},y()(e.updatedAt).fromNow()))))})),k.a.createElement(c["a"],{bodyStyle:{padding:0},bordered:!1,className:D.a.activeCard,title:"\u52a8\u6001",loading:d},k.a.createElement(o["a"],{loading:d,size:"large"},k.a.createElement("div",{className:D.a.activitiesList},this.renderActivities())))),k.a.createElement(n["a"],{xl:8,lg:24,md:24,sm:24,xs:24},k.a.createElement(c["a"],{style:{marginBottom:24},title:"\u5feb\u901f\u5f00\u59cb / \u4fbf\u6377\u5bfc\u822a",bordered:!1,bodyStyle:{padding:0}},k.a.createElement(G,{onAdd:function(){},links:U,linkElement:N["a"]})),k.a.createElement(c["a"],{style:{marginBottom:24},bordered:!1,title:"XX \u6307\u6570",loading:0===p.length},k.a.createElement("div",{className:D.a.chart},k.a.createElement(j["i"],{hasLegend:!0,height:343,data:p}))),k.a.createElement(c["a"],{bodyStyle:{paddingTop:12,paddingBottom:12},bordered:!1,title:"\u56e2\u961f",loading:s},k.a.createElement("div",{className:D.a.members},k.a.createElement(r["a"],{gutter:48},l.map(function(e){return k.a.createElement(n["a"],{span:12,key:"members-item-".concat(e.id)},k.a.createElement(N["a"],{to:e.href},k.a.createElement(i["a"],{src:e.logo,size:"small"}),k.a.createElement("span",{className:D.a.member},e.member)))})))))))}}]),a}(g["PureComponent"]))||z);t["default"]=H},wnz0:function(e,t,a){e.exports={activitiesList:"antd-pro-pages-dashboard-workplace-activitiesList",username:"antd-pro-pages-dashboard-workplace-username",event:"antd-pro-pages-dashboard-workplace-event",pageHeaderContent:"antd-pro-pages-dashboard-workplace-pageHeaderContent",avatar:"antd-pro-pages-dashboard-workplace-avatar",content:"antd-pro-pages-dashboard-workplace-content",contentTitle:"antd-pro-pages-dashboard-workplace-contentTitle",extraContent:"antd-pro-pages-dashboard-workplace-extraContent",statItem:"antd-pro-pages-dashboard-workplace-statItem",members:"antd-pro-pages-dashboard-workplace-members",member:"antd-pro-pages-dashboard-workplace-member",projectList:"antd-pro-pages-dashboard-workplace-projectList",cardTitle:"antd-pro-pages-dashboard-workplace-cardTitle",projectGrid:"antd-pro-pages-dashboard-workplace-projectGrid",projectItemContent:"antd-pro-pages-dashboard-workplace-projectItemContent",datetime:"antd-pro-pages-dashboard-workplace-datetime",activeCard:"antd-pro-pages-dashboard-workplace-activeCard"}}}]);