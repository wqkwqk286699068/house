(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[61],{"0sHc":function(e,t,a){"use strict";a.r(t);a("IzEo");var n,i,r,o,l=a("bx4M"),s=(a("14J3"),a("BMrR")),c=(a("O3gP"),a("lrIw")),d=(a("jCWc"),a("kPKH")),u=(a("+L6B"),a("2/Rp")),m=a("2Taf"),f=a.n(m),h=a("vZ4D"),g=a.n(h),p=a("rlhR"),y=a.n(p),k=a("MhPg"),b=a.n(k),w=a("l4Ni"),S=a.n(w),v=a("ujKo"),j=a.n(v),E=(a("y8nQ"),a("Vl3Y")),M=(a("OaEy"),a("2fM7")),x=a("q1tI"),J=a.n(x),C=a("MuoO"),O=a("mOP9"),R=a("Aeqt"),q=a("CkN6"),D=a("zHco"),N=a("LLXN"),I=a("vDqi"),z=a.n(I),T=(a("Qyje"),a("HZnN")),W=a("xNuS");function H(e){var t=P();return function(){var a,n=j()(e);if(t){var i=j()(this).constructor;a=Reflect.construct(n,arguments,i)}else a=n.apply(this,arguments);return S()(this,a)}}function P(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}var X=M["a"].Option,V=E["a"].Item,U=(n=Object(C["connect"])(function(e){var t=e.JwDbModel,a=e.JwMarkingModel,n=e.loading,i=e.user;return{JwDbModel:t,JwMarkingModel:a,loading:n.effects["JwDbModel/getriskdb"],currentUser:i.currentUser}}),i=E["a"].create(),n(r=i((o=function(e){b()(a,e);var t=H(a);function a(e){var n;return f()(this,a),n=t.call(this,e),n.search=function(){var e=n.props,t=e.dispatch,a=(e.match,n.state.isClick),i=n.state,r=i.examinename,o=i.dbState,l=i.effective,s=i.syscode2,c=y()(n);a&&(t({type:"JwDbModel/getriskdb",payload:{examinename:r||void 0,dbState:o||void 0,effective:l,syscode:s}}).then(function(){var e=n.props.JwDbModel.data;e&&e.pagination&&n.setState({fenye:{current:e.pagination.current}})}),n.setState({isClick:!1,examinename:r||void 0,dbState:o||void 0}),setTimeout(function(){c.setState({isClick:!0})},1e3))},n.handleStandardTableChange=function(e){var t=n.props.dispatch,a=n.state,i=a.dbState,r=a.examinename,o=a.syscode,l=a.effective,s={iflag:"0","page.current":e.current,"page.size":e.pageSize,total:e.total,examinename:r,dbState:i,syscode:o,effective:l},c={current:e.current,size:e.pageSize,total:e.total};n.setState({fenye:c,dbState:i,examinename:r}),t({type:"JwDbModel/getriskdb",payload:s})},n.Clear=function(){var e=n.props.dispatch;e({type:"JwMarkingModel/Clear"})},n.state={selectedRows:[],isClick:!0,companyname:"",dbState:null,fenye:"",dataSourceXdName:[],dataSourceSys:[],effective:"",syscode:""},n}return g()(a,[{key:"componentDidMount",value:function(){var e=this,t=this.props,a=t.dispatch,n=t.location,i=n.query,r=i.current,o=i.size,l=i.examinename,s=(i.total,i.dbState),c=i.syscode2,d=i.effective;this.setState({dbState:s,syscode2:c,effective:d});var u={"page.current":r,"page.size":o,examinename:l,dbState:s,syscode:c,effective:d};a({type:"JwDbModel/getriskdb",payload:u}).then(function(){var t=e.props.JwDbModel.data;t&&t.pagination&&e.setState({fenye:{current:t.pagination.current}})})}},{key:"dbstate",value:function(e){this.setState({dbState:e})}},{key:"handleChange",value:function(e){this.setState({examinename:e});var t=this,a=[];a.length=0,z.a.get("".concat(R["a"],"/account/order/getname"),{params:{examineName:e}}).then(function(e){if(null!=e.data&&e.data.length>0)for(var n=0;n<e.data.length;n++)a.push(J.a.createElement(X,{key:e.data[n]},e.data[n]));else a.push(J.a.createElement(X,{key:Object(N["formatMessage"])({id:"jindiao.JwReconciliation.null"}),disabled:!0},Object(N["formatMessage"])({id:"jindiao.JwReconciliation.null"})));t.setState({dataSource:a})}).catch(function(e){})}},{key:"handleChangeXdName",value:function(e){this.setState({effective:e});var t=this,a=[];a.length=0,z.a.get("".concat(R["a"],"/account/order/getCompanyName"),{params:{examineName:e}}).then(function(e){if(null!=e.data&&e.data.length>0)for(var n=0;n<e.data.length;n++)a.push(J.a.createElement(X,{key:e.data[n]},e.data[n]));else a.push(J.a.createElement(X,{key:Object(N["formatMessage"])({id:"jindiao.JwReconciliation.null"}),disabled:!0},Object(N["formatMessage"])({id:"jindiao.JwReconciliation.null"})));t.setState({dataSourceXdName:a})}).catch(function(e){})}},{key:"handleChangeSysCode",value:function(e){this.setState({syscode:e,syscode2:e});var t=this,a=[];a.length=0,z.a.get("".concat(R["a"],"/marking/JwMarking/getSysCode"),{params:{sysCode:e}}).then(function(e){if(null!=e.data&&e.data.length>0)for(var n=0;n<e.data.length;n++)a.push(J.a.createElement(X,{key:e.data[n]},e.data[n]));else a.push(J.a.createElement(X,{key:Object(N["formatMessage"])({id:"jindiao.JwReconciliation.null"}),disabled:!0},Object(N["formatMessage"])({id:"jindiao.JwReconciliation.null"})));t.setState({dataSourceSys:a})}).catch(function(e){})}},{key:"handleChangelike",value:function(e){this.setState({examinename:e});var t=this,a=[];a.length=0,z.a.get("".concat(R["a"],"/risk/jwRisk/getriskByName"),{params:{examinename:e}}).then(function(e){if(null!=e.data&&e.data.length>0)for(var n=0;n<e.data.length;n++)a.push(J.a.createElement(X,{key:e.data[n]},e.data[n]));else a.push(J.a.createElement(X,{key:Object(N["formatMessage"])({id:"jindiao.JwReconciliation.null"}),disabled:!0},Object(N["formatMessage"])({id:"jindiao.JwReconciliation.null"})));t.setState({dataSource:a})}).catch(function(e){})}},{key:"renderRiskAssembly",value:function(){var e=this,t=this.props.form.getFieldDecorator,a=this.state,n=a.dataSource,i=a.examinename,r=a.dbState,o=a.dataSourceSys,m=a.dataSourceXdName,f=a.effective,h=a.syscode2;return J.a.createElement(l["a"],{bordered:!0,style:{height:80}},J.a.createElement(E["a"],null,J.a.createElement(s["a"],{gutter:{md:4,lg:20,xl:12}},J.a.createElement(d["a"],{md:2,sm:24,style:{float:"right"}},J.a.createElement(V,null,t("search",{})(J.a.createElement(T["a"],{authority:"marking:markingHistory:search"},J.a.createElement(u["a"],{type:"primary",style:{backgroundColor:"#3D73FE",width:"100%"},onClick:function(){return e.search()}},Object(N["formatMessage"])({id:"jindiao.JwWqkrisk.jwwqk.search"})))))),J.a.createElement(d["a"],{md:3,sm:24,style:{float:"right"}},J.a.createElement(V,null,t("reportstartdate",{initialValue:r})(J.a.createElement(M["a"],{placeholder:"\u6253\u6807\u72b6\u6001",onChange:this.dbstate.bind(this)},J.a.createElement(X,{value:""},"\u5168\u90e8"),J.a.createElement(X,{value:"1"},"\u672a\u5b8c\u6210"),J.a.createElement(X,{value:"2"},"\u5df2\u5b8c\u6210"))))),J.a.createElement(d["a"],{lg:5,md:2,sm:24,style:{float:"right"}},J.a.createElement(V,null,t("name",{initialValue:i})(J.a.createElement(c["a"],{ref:function(t){return e.input=t},dataSource:n,onChange:this.handleChange.bind(this),placeholder:Object(N["formatMessage"])({id:"jindiao.JwReconciliation.name"})})))),J.a.createElement(d["a"],{lg:5,md:2,sm:24,style:{float:"right"}},J.a.createElement(V,null,t("effective",{initialValue:f})(J.a.createElement(c["a"],{ref:function(t){return e.input=t},dataSource:m,onChange:this.handleChangeXdName.bind(this),placeholder:Object(N["formatMessage"])({id:"jindiao.JwPay.xdname"})})))),J.a.createElement(d["a"],{lg:5,md:2,sm:24,style:{float:"right"}},J.a.createElement(V,null,t("syscode",{initialValue:h})(J.a.createElement(c["a"],{ref:function(t){return e.input=t},dataSource:o,onChange:this.handleChangeSysCode.bind(this),placeholder:Object(N["formatMessage"])({id:"jindiao.Jwhome.syscode"})})))))))}},{key:"render",value:function(){var e=this,t=this.state,a=t.selectedRows,n=t.fenye,i=t.dbState,r=t.examinename,o=t.syscode2,s=t.effective,c=this.props,d=c.JwDbModel.data,u=c.loading,m=1040,f=[{title:Object(N["formatMessage"])({id:"jindiao.JwWqkrisk.jwwqk.examinename"}),dataIndex:"examinename",key:"examinename",width:200,render:function(e){return J.a.createElement(W["a"],{tooltip:!0,lines:1},e)}},{title:Object(N["formatMessage"])({id:"jindiao.JwWqkrisk.jwwqk.dbState"}),dataIndex:"massageName",key:"massageName",render:function(e){return"2"==e?J.a.createElement("span",null,"\u5df2\u5b8c\u6210"):J.a.createElement("span",null,"\u672a\u5b8c\u6210")}},{title:Object(N["formatMessage"])({id:"jindiao.JwWqkrisk.jwwqk.caibaoReport"}),dataIndex:"reportTypeState",key:"reportTypeState",render:function(e){return"1"==e?J.a.createElement("span",null,"\u5df2\u4e0a\u4f20"):"2"==e?J.a.createElement("span",null,"\u672a\u4e0a\u4f20"):J.a.createElement("span",null,"\u65e0\u9700\u4e0a\u4f20")}},{title:Object(N["formatMessage"])({id:"jindiao.JwWqkrisk.jwwqk.dbDate"}),dataIndex:"orderdate",key:"orderdate",render:function(e){return J.a.createElement(W["a"],{tooltip:!0,lines:1},e)}},{title:Object(N["formatMessage"])({id:"jindiao.JwWqkrisk.jwwqk.user"}),dataIndex:"markUser",key:"markUser",render:function(e){return J.a.createElement(W["a"],{tooltip:!0,lines:1},e)}},{title:Object(N["formatMessage"])({id:"jindiao.JwWqkrisk.jwwqk.caozuo"}),dataIndex:"riskinfocount",align:"center",fixed:"right",width:100,render:function(t,a){return J.a.createElement(T["a"],{authority:"marking:markingHistory:dabiao"},J.a.createElement(x["Fragment"],null,J.a.createElement(O["a"],{onClick:e.Clear,to:{pathname:"/marking/jwriskreport",query:{syscode:a.syscode,name:a.examinename,iflag:3,reportTypestate:a.reportTypeState,ifglgs:a.ifglgs,fenye:n,dbState:i,examinename:r,generatereportstate:a.generatereportstate,syscode2:o,effective:s}}},"\u6253\u6807")))}}],h=[],g=T["a"].check("marking:markingHistory:userCode","1",null);null!==g&&(m+=100);var p=[{title:"\u8ba2\u5355\u53f7",dataIndex:"syscode",key:"syscode",width:160,render:function(e){return J.a.createElement(W["a"],{maxline:10,tooltip:!0,lines:1},e)}},{title:Object(N["formatMessage"])({id:"jindiao.JwWqkrisk.jwwqk.exterpriseame"}),dataIndex:"effective",key:"effective",width:180,render:function(e){return J.a.createElement(W["a"],{tooltip:!0,lines:1},e)}}],y=[{title:"\u7533\u8bf7\u4eba",dataIndex:"username",key:"username",width:"8%",render:function(e){return J.a.createElement(T["a"],{authority:"marking:markingHistory:userCode"},J.a.createElement(W["a"],{maxline:6,tooltip:!0,lines:1},e))}}];h.push(p[0]),h.push(p[1]),null!==g&&h.push(y[0]);for(var k=0;k<f.length;k++)h.push(f[k]);return J.a.createElement(D["a"],null,this.renderRiskAssembly(),J.a.createElement(l["a"],{bodyStyle:{paddingTop:0}},J.a.createElement(q["a"],{rowKey:"id",selectedRows:a,loading:u,data:d,columns:h,onSelectRow:null,rowSelection:null,onChange:this.handleStandardTableChange,scroll:{x:m}})))}}]),a}(x["PureComponent"]),r=o))||r)||r);t["default"]=U}}]);