(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[23],{MIQ6:function(e,a,t){"use strict";t.r(a);t("14J3");var n,l,i,o,r,u,s=t("BMrR"),c=(t("IzEo"),t("bx4M")),p=t("2Taf"),d=t.n(p),m=t("vZ4D"),f=t.n(m),g=t("MhPg"),b=t.n(g),y=t("l4Ni"),h=t.n(y),v=t("ujKo"),k=t.n(v),w=(t("B9cy"),t("Ol7k")),O=t("q1tI"),x=t.n(O),E=t("zHco"),S=t("LLXN"),C=(t("T2oS"),t("W9HT")),M=(t("+L6B"),t("2/Rp")),J=(t("Pwec"),t("CtXQ")),j=t("eHn4"),N=t.n(j),z=(t("g9YV"),t("wCAj")),P=(t("DZo9"),t("8z0m")),V=(t("/zsF"),t("PArb")),A=(t("P2fV"),t("NJEC")),I=t("gWZ8"),F=t.n(I),R=(t("jCWc"),t("kPKH")),D=t("jehZ"),B=t.n(D),L=(t("O3gP"),t("lrIw")),T=(t("2qtc"),t("kLXV")),Z=t("p0pE"),q=t.n(Z),H=t("rlhR"),_=t.n(H),Q=t("Y/ft"),W=t.n(Q),X=(t("y8nQ"),t("Vl3Y")),Y=(t("OaEy"),t("2fM7")),K=(t("5NDa"),t("5rEg")),$=t("MuoO"),G=(t("Po9p"),t("vDqi")),U=t.n(G),ee=t("Qyje"),ae=t.n(ee),te=t("Aeqt"),ne=t("HZnN");function le(e){var a=ie();return function(){var t,n=k()(e);if(a){var l=k()(this).constructor;t=Reflect.construct(n,arguments,l)}else t=n.apply(this,arguments);return h()(this,t)}}function ie(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}K["a"].Group;var oe=Y["a"].Option,re=X["a"].Item,ue=x.a.createContext(),se=function(e){var a=e.form,t=(e.index,W()(e,["form","index"]));return x.a.createElement(ue.Provider,{value:a},x.a.createElement("tr",t))},ce=X["a"].create()(se),pe=/^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/;function de(e){for(var a=/^[\u4e00-\u9fa5]{0,}$/,t=0,n=0;n<e.length;n++)a.test(e[n])?t+=2:t++;return t}function me(e){var a=e.split(""),t=[],n=!0;for(var l in a)if(t.push(e.charCodeAt(l)),t.length===a.length)for(var i=1;i<=t.length;i++)if(Math.abs(Number(t[i])-Number(t[i-1]))>1){n=!1;break}return n}function fe(e){var a={};for(var t in e){if(a[e[t]])return e[t];a[e[t]]=!0}return"0"}var ge=(n=Object($["connect"])(function(e){var a=e.JwbulkModels,t=e.loading;return{JwbulkModels:a,loading2:t.effects["JwbulkModels/saveOrder"],loading:t.effects["JwbulkModels/getname"]}}),n((i=function(e){b()(t,e);var a=le(t);function t(){var e;d()(this,t);for(var n=arguments.length,l=new Array(n),i=0;i<n;i++)l[i]=arguments[i];return e=a.call.apply(a,[this].concat(l)),e.state={editing:!1,nameValidate:!1,mailboxValidate:!1,poValidate:!1,companytip:!1},e.toggleEdit=function(){var a=!e.state.editing;e.setState({editing:a},function(){a&&e.input.focus()})},e.CompanyOnblur=function(a){var t=e.props,n=t.record,l=t.handleSave,i=_()(e),o=[{examineCCode:null}],r=[];r.length=0,e.form.validateFields(["examineName"],{},function(t,u){if(void 0==a||""==a||null==a)return e.setState({nameValidate:!0,nameBucunzai:!1}),u.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.CompanyNamenotnull"}),void l(q()({},n,u));de(a)>=8?(u.examineName=a,e.setState({nameValidate:!1,nameLength:!1}),e.getCompany(i,r,a,!0),e.getCompanyCode(a,o,u)):(e.setState({nameValidate:!0,nameLength:!0,nameBucunzai:!1}),u.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.info10"}),l(q()({},n,u)))})},e.CompanyOnSelect=function(a){var t=e.props,n=t.record,l=t.handleSave,i=_()(e),o=[{examineCCode:null}],r=[];r.length=0,e.form.validateFields(["examineName"],{},function(t,u){if(void 0==a||""==a||null==a)return e.setState({nameValidate:!0,nameBucunzai:!1}),u.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.CompanyNamenotnull"}),void l(q()({},n,u));de(a)>=8?(u.examineName=a,e.setState({nameValidate:!1,nameLength:!1}),e.getCompany(i,r,a,!1),e.getCompanyCode(a,o,u)):(e.setState({nameValidate:!0,nameLength:!0,nameBucunzai:!1}),u.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.info10"}),l(q()({},n,u)))})},e.handleChange=function(a){e.form.validateFields(["examineName"],{},function(t,n){var l=_()(e),i=[];i.length=0;var o=a.trim();-1===o.indexOf("'")&&e.getCompany(l,i,o,!1)})},e.maolOnblur=function(a){var t=e.props,n=t.record,l=t.handleSave;e.form.validateFields(["mailbox"],{},function(t,i){if(i.mailbox=a,null!=a&&""!=a&&!pe.test(a))return e.setState({mailboxValidate:!0}),void l(q()({},n,i));e.setState({mailboxValidate:!1}),l(q()({},n,i))})},e.poOblur=function(a){var t=e.props,n=t.record,l=t.handleSave;e.form.validateFields(["PO"],{},function(a,t){if(void 0!=t.PO&&null!=t.PO&&""!=t.PO)return e.setState({poValidate:!1}),void l(q()({},n,t));1==e.state.poflag&&(e.setState({poValidate:!0}),l(q()({},n,t)))})},e.rule=function(a,t,n){var l=e.props;l.record,l.handleSave;n()},e.handleChangeemail=function(a){e.setState({dataSourceemail:!a||a.indexOf("@")>=0?[]:["".concat(a,"@gmail.com"),"".concat(a,"@163.com"),"".concat(a,"@qq.com"),"".concat(a,"@aliyun.com")]})},e}return f()(t,[{key:"componentDidMount",value:function(){var e=this;U.a.get("".concat(te["a"],"/apply/bulkapply/getPoflag")).then(function(a){e.setState({poflag:a.data})})}},{key:"getCompanyCode",value:function(e,a,t){if(de(e)>=8){var n=/\d{3}/,l=/([a-zA-Z])\1/;if(console.log(me(e),n.test(e),l.test(e),789),me(e)||n.test(e)||l.test(e))return _this.setState({nameValidate:!0,nameBucunzai:!0}),t.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.gongsiiscunzai"}),void r(q()({},o,t))}var i=this.props,o=i.record,r=i.handleSave,u={name:e};U.a.post("".concat(te["a"],"/apply/bulkapply/selectCompanyCode"),ae.a.stringify(u)).then(function(e){void 0!=e&&null!=e.data?(a.examineCCode=e.data,r(q()({},o,t,a))):(a.examineCCode="",r(q()({},o,t,a)))})}},{key:"getCompany",value:function(e,a,t,n){var l=this.props,i=l.record,o=l.handleSave,r={examineName:t,flag:n?"blur":"change"};if(void 0!==t&&null!==t&&""!==t)if(de(t)>=8){var u=/\d{3}/,s=/([a-zA-Z])\1/;if(console.log(me(t),u.test(t),s.test(t),789),me(t)||u.test(t)||s.test(t))return e.setState({nameValidate:!0,nameBucunzai:!0}),r.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.gongsiiscunzai"}),void o(q()({},i,r));U.a.post("".concat(te["a"],"/apply/bulkapply/selectCompany"),ae.a.stringify(r)).then(function(l){if(!(null!=l.data&&l.data.length>0))return e.setState({nameValidate:!0,nameBucunzai:!0}),r.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.gongsiiscunzai"}),void o(q()({},i,r));for(var u=[],s=[],c=0;c<l.data.length;c++)"\u6ce8\u9500"!==l.data[c].status&&"\u540a\u9500"!==l.data[c].status&&"\u505c\u4e1a"!==l.data[c].status||s.push(l.data[c].examineName),u.push(l.data[c].examineName);if(s&&s.length>0&&-1!==s.indexOf(r.examineName)&&(e.setState({nameValidate:!0,companytip:!0}),r.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.notsupport"}),o(q()({},i,r))),n){if(fe(u)===t)return void T["a"].info({title:"".concat(Object(S["formatMessage"])({id:"baogao.chongfugongsi"}))});for(var p=0;p<u.length;p++)a.push(x.a.createElement(oe,{key:u[p]},u[p]))}else for(p=0;p<u.length;p++)a.push(x.a.createElement(oe,{key:u[p]},u[p]));e.setState({dataSource:a})})}else this.setState({nameBucunzai:!1,nameValidate:!0,nameLength:!0}),r.examineName=Object(S["formatMessage"])({id:"Jwbulkapply.info10"}),o(q()({},i,r));else this.setState({nameValidate:!0,nameBucunzai:!1,nameLength:!1})}},{key:"render",value:function(){var e=this,a=this.state,t=a.editing,n=a.nameValidate,l=a.mailboxValidate,i=a.poValidate,o=a.nameBucunzai,r=a.nameLength,u=a.companytip,c=this.props,p=(c.JwbulkModels.namelist,c.editable),d=c.dataIndex,m=(c.title,c.record,c.index,c.handleSave,W()(c,["JwbulkModels","editable","dataIndex","title","record","index","handleSave"])),f={labelCol:{span:7},wrapperCol:{span:24}};return x.a.createElement("td",m,p?x.a.createElement(ue.Consumer,null,function(a){return e.form=a,t?"examineName"==d?x.a.createElement(s["a"],null,x.a.createElement(R["a"],null,x.a.createElement(re,B()({},f,{style:{margin:0},validateStatus:n?"error":"",help:n?Object(S["formatMessage"])({id:u?"Jwbulkapply.notsupport":r?"Jwbulkapply.nameLength":o?"Jwbulkapply.gongsiiscunzai":"Jwbulkapply.CompanyNamenotnull"}):""}),a.getFieldDecorator(d,{rules:[{required:!0,validator:e.rule}]})(x.a.createElement("div",null,x.a.createElement(L["a"],{ref:function(a){return e.input=a},dataSource:e.state.dataSource,style:{width:"95%",margin:0},onChange:e.handleChange,onSelect:e.CompanyOnSelect,onBlur:e.CompanyOnblur,placeholder:Object(S["formatMessage"])({id:"Jwbulkapply.inputCompanyName"}),onFocus:function(){e.setState({nameValidate:!1})}}),x.a.createElement("div",{style:{width:"100%",height:10}})))))):"mailbox"==d?x.a.createElement(s["a"],null,x.a.createElement(R["a"],null,x.a.createElement(re,B()({},f,{style:{margin:0},validateStatus:l?"error":"",help:l?Object(S["formatMessage"])({id:"baogao.true.email"}):""}),a.getFieldDecorator(d,{rules:[{required:!0,validator:e.rule}]})(x.a.createElement("div",null,x.a.createElement(L["a"],{ref:function(a){return e.input=a},style:{width:"95%",margin:0},dataSource:e.state.dataSourceemail,onChange:e.handleChangeemail,onBlur:e.maolOnblur,onSelect:e.handleChangeemail,placeholder:Object(S["formatMessage"])({id:"Jwbulkapply.info5"})}),x.a.createElement("div",{style:{width:"100%",height:10}})))))):x.a.createElement(s["a"],null,x.a.createElement(R["a"],null,x.a.createElement(re,B()({},f,{style:{margin:0},validateStatus:i?"error":"",help:i?Object(S["formatMessage"])({id:"Jwbulkapply.ponotnull"}):""}),a.getFieldDecorator(d,{rules:[{required:!0,validator:e.rule}]})(x.a.createElement("div",null,x.a.createElement(L["a"],{ref:function(a){return e.input=a},style:{width:"95%",margin:0},onBlur:e.poOblur,placeholder:Object(S["formatMessage"])({id:"Jwbulkapply.po"}),onFocus:function(){e.setState({poValidate:!1})}}),x.a.createElement("div",{style:{width:"100%",height:10}})))))):x.a.createElement("div",{className:"editable-cell-value-wrap",style:{paddingRight:24,cursor:"pointer",padding:"10px"},onClick:e.toggleEdit},m.children)}):m.children)}}]),t}(x.a.Component),l=i))||l),be=[],ye=(o=Object($["connect"])(function(e){var a=e.JwbulkModels,t=e.loading;return{JwbulkModels:a,loading:t.effects["JwbulkModels/saveOrder"]}}),o((u=function(e){b()(t,e);var a=le(t);function t(e){var n;return d()(this,t),n=a.call(this,e),n.pro={name:"file",action:"".concat(te["a"],"/apply/bulkapply/bulkImport"),method:"POST",onChange:function(e){"done"===e.file.status&&(e.file.response.success?T["a"].success({title:e.file.response.msg}):T["a"].error({title:e.file.response.msg}))}},n.exportInfo=function(e){var a=n.props.dispatch;a({type:"JwbulkModels/isLogin",payload:n.state}).then(function(){var e=n.props.JwbulkModels.loginstate;void 0!=e&&window.open("".concat(te["a"],"/apply/bulkapply/uploadFile"))})},n.handleSubmit=function(e){var a,t,l=n.props.dispatch,i=n.state,o=i.dataSource,r=(i.className,_()(n),[]),u=[];be.length=0,n.setState({spinning:!0});for(var s=0;s<o.length;s++){var c=o[s].examineName;o[s].examineName==Object(S["formatMessage"])({id:"Jwbulkapply.info10"})&&r.push(x.a.createElement("p",null,o[s].examineName)),o[s].examineName==Object(S["formatMessage"])({id:"Jwbulkapply.notsupport"})&&u.push(x.a.createElement("p",null,c)),null===o[s].examineName||""===o[s].examineName||o[s].examineName===Object(S["formatMessage"])({id:"Jwbulkapply.inputCompanyName"})||o[s].examineName===Object(S["formatMessage"])({id:"Jwbulkapply.CompanyNamenotnull"})?r.push(x.a.createElement("p",null,Object(S["formatMessage"])({id:"Jwbulkapply.CompanyNamenotnull"}))):a=c.indexOf(","),c.slice(a+1)===Object(S["formatMessage"])({id:"Jwbulkapply.gongsiiscunzai"})&&r.push(x.a.createElement("p",null,c)),1==n.state.poflag?null===o[s].PO||""===o[s].PO||o[s].PO===Object(S["formatMessage"])({id:"Jwbulkapply.po"})?r.push(x.a.createElement("p",null,Object(S["formatMessage"])({id:"Jwbulkapply.ponotnull"}))):t=o[s].PO:t=null;for(var p=0;p<o.length;p++)for(var d=p+1;d<o.length;d++){if(o[p].examineName!==Object(S["formatMessage"])({id:"Jwbulkapply.notsupport"})&&o[p].examineName==o[d].examineName)return r.push(x.a.createElement("p",null,o[p].examineName+Object(S["formatMessage"])({id:"Jwbulkapply.chongfu"}))),he(r),void n.setState({spinning:!1});if(o[p].PO!=o[d].PO)return r.push(x.a.createElement("p",null,Object(S["formatMessage"])({id:"Jwbulkapply.info12"}))),he(r),void n.setState({spinning:!1})}if(null==o[s].mailbox||o[s].mailbox==Object(S["formatMessage"])({id:"Jwbulkapply.info5"})||""==o[s].mailbox||pe.test(o[s].mailbox)||r.push(x.a.createElement("p",null,Object(S["formatMessage"])({id:"Jwbulkapply.info11"}))),r!=[]&&r.length>0)return he(r),void n.setState({spinning:!1});be.push({examineName:o[s].examineName,examineCCode:o[s].examineCCode,mailbox:o[s].mailbox,PO:t,reportType:o[0].reportType,languages:o[0].languages})}return u&&u.length>0?(ve(u),void n.setState({spinning:!1})):r!=[]&&0!=r.length?(he(r),void n.setState({spinning:!1})):void l({type:"JwbulkModels/saveOrder",payload:{list:JSON.stringify(be)}}).then(function(e){if(0===e.code){T["a"].success({title:e.msg});var a=(new Date).getTime();n.setState({dataSource:[{key:a,examineName:Object(S["formatMessage"])({id:"Jwbulkapply.inputCompanyName"}),examineCCode:"",PO:Object(S["formatMessage"])({id:"Jwbulkapply.po"}),mailbox:Object(S["formatMessage"])({id:"Jwbulkapply.info5"}),delete:Object(S["formatMessage"])({id:"Jwbulkapply.caozuo"}),reportType:1,languages:1}]})}else 1===e.code?T["a"].info({title:e.msg}):2===e.code?T["a"].info({title:e.msg}):T["a"].error({title:e.msg});n.setState({spinning:!1})})},n.handleDelete=function(e){var a=F()(n.state.dataSource);n.setState({dataSource:a.filter(function(a){return a.key!==e})})},n.handleAdd=function(){var e=n.state,a=e.count,t=e.dataSource,l={key:a,examineName:Object(S["formatMessage"])({id:"Jwbulkapply.inputCompanyName"}),examineCCode:"",PO:Object(S["formatMessage"])({id:"Jwbulkapply.po"}),mailbox:Object(S["formatMessage"])({id:"Jwbulkapply.info5"}),reportType:n.state.reportType,languages:n.state.languages};n.setState({dataSource:[].concat(F()(t),[l]),count:a+1})},n.handleSave=function(e){var a=F()(n.state.dataSource),t=a.findIndex(function(a){return e.key===a.key}),l=a[t];a.splice(t,1,q()({},l,e)),n.setState({dataSource:a})},n.aa=function(e){console.log(e,123)},n.columns=[{title:Object(S["formatMessage"])({id:"Jwbulkapply.name"}),dataIndex:"examineName",width:"30%",height:100,align:"center",editable:!0,render:function(e,a){return x.a.createElement("div",null,x.a.createElement(K["a"],{value:e,style:{width:"100%",textAlign:"center"}}))}},{title:Object(S["formatMessage"])({id:"Jwbulkapply.code"}),dataIndex:"examineCCode",width:"15%",height:100,align:"center"},{title:Object(S["formatMessage"])({id:"baogao.po"}),dataIndex:"PO",width:"15%",height:100,align:"center",editable:!0,render:function(e,a){return x.a.createElement("div",null,x.a.createElement(K["a"],{value:e,style:{width:"100%",textAlign:"center"}}))}},{title:Object(S["formatMessage"])({id:"Jwbulkapply.email"}),dataIndex:"mailbox",editable:!0,width:"20%",height:100,align:"center",render:function(e,a){return x.a.createElement("div",null,x.a.createElement(K["a"],{value:e,style:{width:"100%",textAlign:"center"}}))}},{title:Object(S["formatMessage"])({id:"Jwbulkapply.caozuo"}),dataIndex:"operation",width:"38%",height:100,align:"center",render:function(e,a){return n.state.dataSource.length>=1?x.a.createElement("div",null,x.a.createElement(ne["a"],{authority:"apply:bulkapply:delete"},x.a.createElement(A["a"],{title:Object(S["formatMessage"])({id:"Jwbulkapply.info4"}),onConfirm:function(){return n.handleDelete(a.key)}},x.a.createElement("a",null,Object(S["formatMessage"])({id:"Jwbulkapply.delete"})))),x.a.createElement(ne["a"],{authority:"apply:bulkapply:opload"},x.a.createElement(V["a"],{type:"vertical"}),x.a.createElement("a",{onClick:n.exportInfo.bind(_()(n))},Object(S["formatMessage"])({id:"Jwbulkapply.upload"})),x.a.createElement(V["a"],{type:"vertical"})),x.a.createElement(ne["a"],{authority:"apply:bulkapply:bulkImport"},x.a.createElement(P["a"],B()({showUploadList:!1},n.pro),x.a.createElement("a",null,x.a.createElement("span",null,Object(S["formatMessage"])({id:"Jwbulkapply.uploadfile"})))))):null}}],n.state={editing:!1,spinning:!1,dataSource:[{key:"0",examineName:Object(S["formatMessage"])({id:"Jwbulkapply.inputCompanyName"}),examineCCode:"",PO:Object(S["formatMessage"])({id:"Jwbulkapply.po"}),mailbox:Object(S["formatMessage"])({id:"Jwbulkapply.info5"}),delete:Object(S["formatMessage"])({id:"Jwbulkapply.caozuo"})}],count:2},n}return f()(t,[{key:"componentDidMount",value:function(){var e=this;U.a.get("".concat(te["a"],"/apply/bulkapply/getApplyInfo")).then(function(a){e.setState({reportType:"1"==a.data.reportType?Object(S["formatMessage"])({id:"Jwbulkapply.youfinancial"}):Object(S["formatMessage"])({id:"Jwbulkapply.nofinancial"}),languages:"1"==a.data.languages?Object(S["formatMessage"])({id:"Jwbulkapply.CH"}):Object(S["formatMessage"])({id:"Jwbulkapply.CHEN"}),dataSource:[{key:"0",examineName:Object(S["formatMessage"])({id:"Jwbulkapply.inputCompanyName"}),examineCCode:"",PO:Object(S["formatMessage"])({id:"Jwbulkapply.po"}),mailbox:Object(S["formatMessage"])({id:"Jwbulkapply.info5"}),delete:Object(S["formatMessage"])({id:"Jwbulkapply.caozuo"}),reportType:a.data.reportType,languages:a.data.languages}]},function(){var a=e.state,t=a.reportType,n=a.languages;e.props.values(t,n)})}),U.a.get("".concat(te["a"],"/apply/bulkapply/getPoflag")).then(function(a){e.setState({poflag:a.data})})}},{key:"render",value:function(){var e=this,a=this.state.dataSource,t={body:{row:ce,cell:ge}},n=this.columns.map(function(a){return a.editable?q()({},a,{onCell:function(t){return{record:t,editable:a.editable,dataIndex:a.dataIndex,title:a.title,handleSave:e.handleSave}}}):a});return x.a.createElement(C["a"],{tip:"\u52a0\u8f7d\u4e2d...",spinning:this.state.spinning},x.a.createElement(z["a"],N()({scroll:{x:"150%"},components:t,style:{padding:0},rowClassName:function(){return"editable-row"},loading:this.props.loading2,bordered:!0,dataSource:a,columns:n,pagination:!1},"scroll",{x:"100%"})),x.a.createElement("br",null),x.a.createElement(ne["a"],{authority:"apply:bulkapply:add"},x.a.createElement(M["a"],{type:"dashed",block:!0,style:N()({color:"#1890FF",backgroundColor:"#EEF7FF"},"color","#3D73FE"),onClick:this.handleAdd},x.a.createElement(J["a"],{type:"plus"}),Object(S["formatMessage"])({id:"Jwbulkapply.insert"}))),x.a.createElement("br",null),x.a.createElement("br",null),x.a.createElement(ne["a"],{authority:"apply:bulkapply:submit"},x.a.createElement(M["a"],{type:"primary",style:{width:100,marginLeft:"45%",backgroundColor:"#3D73FE"},onClick:this.handleSubmit.bind(this)},Object(S["formatMessage"])({id:"Jwbulkapply.submit"}))))}}]),t}(x.a.Component),r=u))||r);function he(e){T["a"].warning({title:Object(S["formatMessage"])({id:"Jwbulkapply.Reminder"}),content:x.a.createElement("div",null,e),onOk:function(){}})}function ve(e){T["a"].warning({title:Object(S["formatMessage"])({id:"Jwbulkapply.notsupport"}),onOk:function(){}})}function ke(e){var a=we();return function(){var t,n=k()(e);if(a){var l=k()(this).constructor;t=Reflect.construct(n,arguments,l)}else t=n.apply(this,arguments);return h()(this,t)}}function we(){if("undefined"===typeof Reflect||!Reflect.construct)return!1;if(Reflect.construct.sham)return!1;if("function"===typeof Proxy)return!0;try{return Date.prototype.toString.call(Reflect.construct(Date,[],function(){})),!0}catch(e){return!1}}var Oe=w["a"].Header,xe=function(e){b()(t,e);var a=ke(t);function t(e){var n;return d()(this,t),n=a.call(this,e),n.state={selectedRows:[],isClick:!0,data:[]},n}return f()(t,[{key:"setlanguagetype",value:function(e,a){this.setState({type:e,language:a})}},{key:"renderRiskAssembly",value:function(){return x.a.createElement(Oe,{style:{backgroundColor:"white",fontSize:"20px",paddingRight:20}},x.a.createElement("span",{style:{fontSize:15,marginLeft:30,float:"right"}},Object(S["formatMessage"])({id:"Jwbulkapply.type"}),"\uff1a",this.state.type),x.a.createElement("span",{style:{fontSize:15,float:"right"}},Object(S["formatMessage"])({id:"Jwbulkapply.language"}),"\uff1a",this.state.language),x.a.createElement("br",null))}},{key:"render",value:function(){return x.a.createElement(E["a"],null,x.a.createElement(s["a"],null,x.a.createElement(Oe,{style:{backgroundColor:"white",fontSize:"20px",padding:10}},x.a.createElement("div",null,this.renderRiskAssembly())),x.a.createElement(c["a"],{bordered:!0},x.a.createElement(ye,{values:this.setlanguagetype.bind(this)}))),x.a.createElement("br",null))}}]),t}(O["PureComponent"]);a["default"]=xe},Po9p:function(e,a){}}]);