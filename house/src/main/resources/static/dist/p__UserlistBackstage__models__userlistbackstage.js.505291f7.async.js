(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[118],{WxBV:function(e,t,a){"use strict";a.r(t);var n=a("p0pE"),r=a.n(n),u=a("d6i3"),s=a.n(u),c=a("opco"),p=a("3Unq"),o=a("GIZZ"),l=a.n(o);t["default"]=l()(p["a"],{namespace:"userlistbackstage",state:{data:[],DataSource:[],idList:[],RoleSource:[],response:"",deleteList:[],deptIdList:[],AllDeptListByIdList:[],queryCannelDeleteList:[]},effects:{fetch:s.a.mark(function e(t,a){var n,r,u,p;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,r=a.call,u=a.put,e.next=4,r(c["i"],n);case 4:return p=e.sent,e.next=7,u({type:"queryList",payload:p});case 7:case"end":return e.stop()}},e)}),selectByNameAndCodeAndCompany:s.a.mark(function e(t,a){var n,u,p,o;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,u=a.call,p=a.put,e.next=4,u(c["l"],n);case 4:return o=e.sent,e.next=7,p({type:"querySuccess",payload:r()({},o)});case 7:case"end":return e.stop()}},e)}),selectByNameAndCompany:s.a.mark(function e(t,a){var n,u,p,o;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,u=a.call,p=a.put,e.next=4,u(c["m"],n);case 4:return o=e.sent,e.next=7,p({type:"querySuccess",payload:r()({},o)});case 7:case"end":return e.stop()}},e)}),selectByDeptId:s.a.mark(function e(t,a){var n,u,p,o;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,u=a.call,p=a.put,e.next=4,u(c["j"],n);case 4:if(o=e.sent,!o){e.next=8;break}return e.next=8,p({type:"queryDeptList",payload:r()({},o)});case 8:return e.abrupt("return",o);case 9:case"end":return e.stop()}},e)}),initSelect:s.a.mark(function e(t,a){var n,u,p,o;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,u=a.call,p=a.put,e.next=4,u(c["e"],n);case 4:return o=e.sent,e.next=7,p({type:"querySuccess",payload:r()({},o)});case 7:case"end":return e.stop()}},e)}),SelectRole:s.a.mark(function e(t,a){var n,r,u,p;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,r=a.call,u=a.put,e.next=4,r(c["b"],n);case 4:return p=e.sent,e.next=7,u({type:"queryRoleList",payload:p});case 7:case"end":return e.stop()}},e)}),deleteById:s.a.mark(function e(t,a){var n,r,u,p;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,r=a.call,u=a.put,e.next=4,r(c["d"],n);case 4:return p=e.sent,e.next=7,u({type:"queryDeleteList",payload:p});case 7:case"end":return e.stop()}},e)}),AllDeptListById:s.a.mark(function e(t,a){var n,r,u,p;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,r=a.call,u=a.put,e.next=4,r(c["a"],n);case 4:return p=e.sent,e.next=7,u({type:"queryAllDeptListById",payload:p});case 7:case"end":return e.stop()}},e)}),queryCannelDeleteById:s.a.mark(function e(t,a){var n,r,u,p;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,r=a.call,u=a.put,e.next=4,r(c["g"],n);case 4:return p=e.sent,e.next=7,u({type:"queryCannelDeleteByIdList",payload:p});case 7:case"end":return e.stop()}},e)}),addCode:s.a.mark(function e(t,a){var n,r,u,p;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,r=a.call,u=a.put,e.next=4,r(c["c"],n);case 4:return p=e.sent,e.next=7,u({type:"addCodeList",payload:p});case 7:case"end":return e.stop()}},e)}),updateCode:s.a.mark(function e(t,a){var n,r,u,p;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,r=a.call,u=a.put,e.next=4,r(c["n"],n);case 4:return p=e.sent,e.next=7,u({type:"updateCodeList",payload:p});case 7:case"end":return e.stop()}},e)}),isLogin:s.a.mark(function e(t,a){var n,r,u,p;return s.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,r=a.call,u=a.put,e.next=4,r(c["f"],n);case 4:return p=e.sent,e.next=7,u({type:"login",payload:p});case 7:case"end":return e.stop()}},e)})},reducers:{login:function(e,t){return r()({},e,{loginstate:t.payload})},queryList:function(e,t){return r()({},e,{DataSource:t.payload||{}})},queryList1:function(e,t){return r()({},e,{idList:t.payload||{}})},queryRoleList:function(e,t){return r()({},e,{RoleSource:t.payload||{}})},queryDeleteList:function(e,t){return r()({},e,{deleteList:t.payload||{}})},updateCodeList:function(e,t){return r()({},e,{updateCodeTip:t.payload||{}})},addCodeList:function(e,t){return r()({},e,{addCodeTip:t.payload||{}})},queryDeptList:function(e,t){return r()({},e,{deptIdList:t.payload||{}})},queryAllDeptListById:function(e,t){return r()({},e,{AllDeptListByIdList:t.payload||{}})},queryCannelDeleteByIdList:function(e,t){return r()({},e,{queryCannelDeleteList:t.payload||{}})}}})}}]);