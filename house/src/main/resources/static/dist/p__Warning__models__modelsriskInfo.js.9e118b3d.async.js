(window["webpackJsonp"]=window["webpackJsonp"]||[]).push([[129],{IcNX:function(e,t,a){"use strict";a.r(t);var n=a("d6i3"),r=a.n(n),s=a("p0pE"),c=a.n(s),u=a("/xYZ"),o=a("pddj"),p=a("GIZZ"),i=a.n(p),l=a("3Unq"),d=a("LLXN");t["default"]=i()(l["a"],{namespace:"modelsriskInfo",state:{},effects:{getriskInfo:r.a.mark(function e(t,a){var n,s,o,p;return r.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,s=a.call,o=a.put,e.next=4,s(u["f"],n);case 4:if(p=e.sent,!p){e.next=8;break}return e.next=8,o({type:"querySuccess",payload:c()({},p)});case 8:case"end":return e.stop()}},e)}),getRuleList:r.a.mark(function e(t,a){var n,s,c,u;return r.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,s=a.call,c=a.put,e.next=4,s(o["c"],n);case 4:return u=e.sent,e.next=7,c({type:"getruleList",payload:u});case 7:case"end":return e.stop()}},e)}),searchfxxh:r.a.mark(function e(t,a){var n,s,u,p;return r.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,s=a.call,u=a.put,e.next=4,s(o["g"],n);case 4:if(p=e.sent,!p){e.next=8;break}return e.next=8,u({type:"queryList",payload:c()({},p)});case 8:case"end":return e.stop()}},e)}),setMessage:r.a.mark(function e(t,a){var n,s,c,u;return r.a.wrap(function(e){while(1)switch(e.prev=e.next){case 0:return n=t.payload,s=a.call,c=a.put,e.next=4,s(o["h"],n);case 4:return u=e.sent,e.next=7,c({type:"update",payload:u});case 7:case"end":return e.stop()}},e)})},reducers:{getruleList:function(e,t){return c()({},e,{RuleList:t.payload})},queryList:function(e,t){var a=t.payload,n=a.records,r=a.current,s=a.total,u=a.size;return c()({},e,{data1:{list:n,pagination:c()({},e.pagination,{current:r,total:s,pageSize:u,showTotal:function(e){return"".concat(Object(d["formatMessage"])({id:"model.total"}),"\n             ").concat(e," \n            ").concat(Object(d["formatMessage"])({id:"model.page"}))}})}})}}})}}]);