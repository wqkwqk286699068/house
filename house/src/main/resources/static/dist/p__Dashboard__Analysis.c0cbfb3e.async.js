(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[36],{ZOrW:function(a,e,t){"use strict";t.r(e);t("14J3");var n,r,s,l=t("BMrR"),i=(t("jCWc"),t("kPKH")),o=(t("qVdP"),t("jsC+")),c=(t("Pwec"),t("CtXQ")),d=(t("lUTK"),t("BvKs")),u=t("2Taf"),p=t.n(u),h=t("vZ4D"),f=t.n(h),y=t("MhPg"),g=t.n(y),m=t("l4Ni"),b=t.n(m),v=t("ujKo"),k=t.n(v),D=t("q1tI"),E=t.n(D),T=t("MuoO"),C=t("v99g"),P=t("+n12"),S=t("lVjH"),R=t.n(S),x=t("xqX8");function w(a){var e=j();return function(){var t,n=k()(a);if(e){var r=k()(this).constructor;t=Reflect.construct(n,arguments,r)}else t=n.apply(this,arguments);return b()(this,t)}}function j(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(a){return!1}}var K=E.a.lazy(function(){return Promise.all([t.e(1),t.e(0),t.e(135)]).then(t.bind(null,"Y65U"))}),V=E.a.lazy(function(){return Promise.all([t.e(1),t.e(0),t.e(138)]).then(t.bind(null,"20K/"))}),O=E.a.lazy(function(){return Promise.all([t.e(1),t.e(0),t.e(139)]).then(t.bind(null,"b2ve"))}),q=E.a.lazy(function(){return Promise.all([t.e(1),t.e(0),t.e(137)]).then(t.bind(null,"tLGd"))}),I=E.a.lazy(function(){return Promise.all([t.e(1),t.e(0),t.e(136)]).then(t.bind(null,"Jqna"))}),A=(n=Object(T["connect"])(function(a){var e=a.chart,t=a.loading;return{chart:e,loading:t.effects["chart/fetch"]}}),n((s=function(a){g()(t,a);var e=w(t);function t(){var a;p()(this,t);for(var n=arguments.length,r=new Array(n),s=0;s<n;s++)r[s]=arguments[s];return a=e.call.apply(e,[this].concat(r)),a.state={salesType:"all",currentTabKey:"",rangePickerValue:Object(P["d"])("year")},a.handleChangeSalesType=function(e){a.setState({salesType:e.target.value})},a.handleTabChange=function(e){a.setState({currentTabKey:e})},a.handleRangePickerChange=function(e){var t=a.props.dispatch;a.setState({rangePickerValue:e}),t({type:"chart/fetchSalesData"})},a.selectDate=function(e){var t=a.props.dispatch;a.setState({rangePickerValue:Object(P["d"])(e)}),t({type:"chart/fetchSalesData"})},a.isActive=function(e){var t=a.state.rangePickerValue,n=Object(P["d"])(e);return t[0]&&t[1]&&t[0].isSame(n[0],"day")&&t[1].isSame(n[1],"day")?R.a.currentDate:""},a}return f()(t,[{key:"componentDidMount",value:function(){var a=this.props.dispatch;this.reqRef=requestAnimationFrame(function(){a({type:"chart/fetch"})})}},{key:"componentWillUnmount",value:function(){var a=this.props.dispatch;a({type:"chart/clear"}),cancelAnimationFrame(this.reqRef)}},{key:"render",value:function(){var a,e=this.state,t=e.rangePickerValue,n=e.salesType,r=e.currentTabKey,s=this.props,u=s.chart,p=s.loading,h=u.visitData,f=u.visitData2,y=u.salesData,g=u.searchData,m=u.offlineData,b=u.offlineChartData,v=u.salesTypeData,k=u.salesTypeDataOnline,T=u.salesTypeDataOffline;a="all"===n?v:"online"===n?k:T;var P=E.a.createElement(d["b"],null,E.a.createElement(d["b"].Item,null,"\u64cd\u4f5c\u4e00"),E.a.createElement(d["b"].Item,null,"\u64cd\u4f5c\u4e8c")),S=E.a.createElement("span",{className:R.a.iconGroup},E.a.createElement(o["a"],{overlay:P,placement:"bottomRight"},E.a.createElement(c["a"],{type:"ellipsis"}))),w=r||m[0]&&m[0].name;return E.a.createElement(C["a"],null,E.a.createElement(D["Suspense"],{fallback:E.a.createElement(x["default"],null)},E.a.createElement(K,{loading:p,visitData:h})),E.a.createElement(D["Suspense"],{fallback:null},E.a.createElement(V,{rangePickerValue:t,salesData:y,isActive:this.isActive,handleRangePickerChange:this.handleRangePickerChange,loading:p,selectDate:this.selectDate})),E.a.createElement("div",{className:R.a.twoColLayout},E.a.createElement(l["a"],{gutter:24},E.a.createElement(i["a"],{xl:12,lg:24,md:24,sm:24,xs:24},E.a.createElement(D["Suspense"],{fallback:null},E.a.createElement(O,{loading:p,visitData2:f,selectDate:this.selectDate,searchData:g,dropdownGroup:S}))),E.a.createElement(i["a"],{xl:12,lg:24,md:24,sm:24,xs:24},E.a.createElement(D["Suspense"],{fallback:null},E.a.createElement(q,{dropdownGroup:S,salesType:n,loading:p,salesPieData:a,handleChangeSalesType:this.handleChangeSalesType}))))),E.a.createElement(D["Suspense"],{fallback:null},E.a.createElement(I,{activeKey:w,loading:p,offlineData:m,offlineChartData:b,handleTabChange:this.handleTabChange})))}}]),t}(D["Component"]),r=s))||r);e["default"]=A},lVjH:function(a,e,t){a.exports={iconGroup:"antd-pro-pages-dashboard-analysis-iconGroup",rankingList:"antd-pro-pages-dashboard-analysis-rankingList",rankingItemNumber:"antd-pro-pages-dashboard-analysis-rankingItemNumber",active:"antd-pro-pages-dashboard-analysis-active",rankingItemTitle:"antd-pro-pages-dashboard-analysis-rankingItemTitle",salesExtra:"antd-pro-pages-dashboard-analysis-salesExtra",currentDate:"antd-pro-pages-dashboard-analysis-currentDate",salesCard:"antd-pro-pages-dashboard-analysis-salesCard",salesBar:"antd-pro-pages-dashboard-analysis-salesBar",salesRank:"antd-pro-pages-dashboard-analysis-salesRank",salesCardExtra:"antd-pro-pages-dashboard-analysis-salesCardExtra",salesTypeRadio:"antd-pro-pages-dashboard-analysis-salesTypeRadio",offlineCard:"antd-pro-pages-dashboard-analysis-offlineCard",twoColLayout:"antd-pro-pages-dashboard-analysis-twoColLayout",trendText:"antd-pro-pages-dashboard-analysis-trendText",rankingTitle:"antd-pro-pages-dashboard-analysis-rankingTitle",salesExtraWrap:"antd-pro-pages-dashboard-analysis-salesExtraWrap"}}}]);