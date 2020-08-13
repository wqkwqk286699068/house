if(typeof console == 'undefined') {
	console = {};
	console .log = function(){}
}

if(typeof $ == 'undefined'){
	console .log('jquery is not imported yet');

}

function json2str(o)
{
	var arr=[];var fmt=function(s)
	{
		if(typeof s=='object'&&s!=null)return json2str(s);return/^(string|number)$/.test(typeof s)?'"'+s+'"':s;
	}
	for(var i in o) arr.push('"'+i+'":'+fmt(o[i]));
	return"{"+arr.join(",")+"}"}function str2json(str){return eval('('+str+')');
};

function str2json(str)
{
	return eval('('+str+')');
};



 

//ajax提交表单
//新后台可删
var subform =  function (f_cfg) {

	f_cfg.dataType = f_cfg.dataType ? f_cfg.dataType : 'json';//默认返回为json，解决了带文件的ajax不能用json的bug
	
	var options = {
		//target : '#output1',
		beforeSubmit : showRequest,
		success : showResponse,
		cache:false,
		dataType: f_cfg.dataType,
		url : f_cfg.url,
		type : 'POST'
	};

	//alert(1);
	$('#'+f_cfg.id).ajaxSubmit(options);
	function showRequest( formData , jqForm , options ) {
		if (f_cfg.comfunc()) {
			var queryString = $.param(formData);
			return true;
		}else return false;

	};

	//alert(2);

	//回调函数

	function showResponse ( responseText , statusText ) {
		//

		//alert(3);
		if(f_cfg.dataType=='json'){
			rs = responseText;
		}else if(f_cfg.dataType=='html'){
            //var responseTextStr1 = responseText.split('{"');
            //var responseTextStr2 = responseTextStr1[1].split('"}');
            //var responseTextNew = '{"' + responseTextStr2[0] + '"}';
            /*var responseTextArr1 = responseText.split('{"');
            var responseTextStr1 = responseTextArr1[1];
            var responseTextArr2 = responseTextStr1.split('"}');
            var responseTextStr2 = responseTextArr2[0];
            var responseTextNew = '{"' + responseTextStr2 + '"}';*/
            responseText =  responseText.replace(/<[^>]+>/g,"");
            //兼容浏览器插件产生的问题
            var responseTextArr = responseText.split("}");
            responseText = responseTextArr[0] + "}";
            rs = str2json(responseText);
            //console.log(responseText);
            //rs = str2json('{"success":true}');
        }else{
			responseText =  responseText.replace(/<[^>]+>/g,"");
			rs = str2json(responseText);
		}
		//	alert( '状态' + statusText + '\n 返回的内容是：\n ' + responseText ) ;
		if(rs.success ==true||rs.success=='true'){
			//alert(4)
			f_cfg.sucfunc(rs);
			//alert('保存成功');
			//window.location.reload();
		}else{
			f_cfg.falfunc(rs);
			//alert(rs.msg);
		}
	};
}





	/**
	* 表单设置方法 验证+ajax提交+回调函数
	* cfg.id  表单id
	* cfg.rule  验证规则
	* cfg.messages 验证失败提示文字
	* cfg.url 表单提交地址
	* cfg.onSubmit	   提交表单时触发的事件
	* cfg.sucfunc(rs); 提交成功回调函数
	* cfg.falfunc(rs); 提交失败回调函数
	* cfg.editors[]; 编辑器
	*/
jQuery.validator.addMethod("ismobile", function(value, element) {  
	if($('.phone_prefix_input').val() && $('.phone_prefix_input').val()!='+86') return true;
     var length = value.length;     
     var mobile = /^1[\d]{10}$/;
     return (length == 11 && mobile.exec(value))? true:false;  
 }, "请正确填写您的手机号码");  

jQuery.validator.addMethod("ismail", function(value, element) {    
     var mail = /^([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+@([a-zA-Z0-9]+[_|\_|\.]?)*[a-zA-Z0-9]+\.[a-zA-Z]{2,3}$/;  
     return (mail.exec(value))? true:false;  
 }, "请正确填写您的电子邮箱"); 

jQuery.validator.addMethod("islink", function(value, element) {
	if(!value){
		return true;
	}
	if(value.indexOf("http") == -1){
		value = 'http://'+value;
	}
	var reg=/(http|ftp|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/;
     if(reg.test(value)){
     	return true;
     }else{
     	return false;
     }
 }, "请正确填写链接地址");
jQuery.validator.addMethod("personcard_check",function(value,element,params){
    if(value.length == 0){
        return false;
    }
    if(value.length == params[0] || value.length == params[1]){
        return true;
    }else{
        return false;
    }
},"请输入15或18位身份证号码");
//新后台可删
var formset = function(cfg){
	cfg.onSubmit = cfg.onSubmit || function(){};
	cfg.comfunc = cfg.comfunc || function(){return true;};
	var subflag = 0;
	//表单验证
	$("#"+cfg.id).validate({
		errorElement: "label",
		errorPlacement: function(error, element) { 
			$('#'+cfg.id+' span[msgfor="'+ element.attr('name') +'"]').html(error);
		}, 
/*		success: function(label) {
			if(typeof cfg .success =='function'){
					cfg .success(label);
			}else label.html("填写正确 ^_^");
		},*/
		ignoreTitle: true,
		ignore:"",
		errorLabelContainer : $('#errorLabelContainer'),
		errorClass			: "validate-error",
		successClass 		: "validate-success",
		beforeSubmit:function(){
			cfg .onSubmit .apply(this);
			for(id in cfg .editors){
				cfg .editors[id] .sync();
			}
		},
		submitHandler:function(form){
			$("#"+cfg.id) .autoFormer();
			if(subflag !=0){
				//return false;
			}
			subflag =1;
			subbtI = $('#' + cfg.id).find('input[type=submit]');
			subbtC = $('#' + cfg.id).find('a.submit');
			
			subbtTextI = subbtI.val();
			subbtTextC = subbtC.text();
			if(subbtTextI=='提交中..'||subbtTextC=='提交中..')return false;
			
			subbtI.val('提交中..');
			subbtC.text('提交中..');
			subform({
				id: cfg.id,
				url: cfg.url,
                dataType:cfg.dataType,
				sucfunc:function(rs){
					subflag = 0;
					subbtI.val(subbtTextI);
					subbtC.text(subbtTextC);
					cfg.sucfunc(rs);
					return false;

				},
				falfunc:function(rs){
					subflag = 0;
					subbtI.val(subbtTextI);
					subbtC.text(subbtTextC);
					cfg.falfunc(rs);
					return false;
				},
				comfunc:function(){
					if(cfg.comfunc())
					return true;
					else return false;
				}
			});
		},
		rules: cfg.rule,
		messages: cfg.messages
	});
}



 //操作成功对话框
 sucdia = function(content,fn,time){
	var options = {};
	var delay;	
	if(typeof(content) == 'string'){
		options.content = content;
		options.fn = fn || function(){};
	}else{
		options = content;
	}
	options.content 	= options.content || '保存成功！';
	options.fn			= options.fn 		|| function(){};
	delay = function(ms, func) {
	    return setTimeout(func, ms);
	};
	toastr.options = {
	    positionClass: 'toast-bottom-left'
	};
	delay(100, function() { 
	    return toastr.success(options.content);
	}); 
	setTimeout(options.fn,2000);  
 }
//弹出框成功
 sucdia2 = function(content,fn,time){
	var options = {};
	if(typeof(content) == 'string'){
		options.content = content;
		options.fn = fn || function(){};
	}else{ 
		options = content;
	}
	options.content 	= options.content || '保存成功！';
	options.time		= options.time 	|| 2;
	options.fn			= options.fn 		|| function(){};
	var dia = M.alert({
		content: options.content,
		icon: 'error',
		drag:false,
		fixed:true,
		time:options.time, 
		cb:function(){
			options.fn();
		}
	});
 }

 sucdia3 = function(content,fn,time){
	var options = {};
	if(typeof(content) == 'string'){
		options.content = content;
		options.fn = fn || function(){};
	}else{
		options = content;
	}
	options.content 	= options.content || '保存成功！';
	options.time		= options.time 	|| 2;
	options.fn			= options.fn 		|| function(){};
	var dia = art.dialog({
		content: options.content+'<br/>'+options.time +'秒后窗口自动关闭',
		icon: 'succeed',
		drag:false,
		fixed:true,
		time:options.time ,
		close:function(){
			options.fn();
		}
	});
 } 


  //操作失败对话框
 faldia = function(content,fn,time){
	var options = {}; 
	if(typeof(content) == 'string'){
		options.content = content;
		options.fn = fn || function(){};
	}else{
		options = content;
	}
	options.content 	= options.content || '保存失败！';
	options.time		= options.time 	|| 2;
	options.fn			= options.fn 		|| function(){};
	var delay;
	delay = function(ms, func) {
	    return setTimeout(func, ms);
	};
	toastr.options = { 
	    positionClass: 'toast-bottom-left'
	};
	delay(10, function() {
	    return toastr.error(options.content);
	}); 
    setTimeout(options.fn,2000); 
 }
  //弹出框错误
 faldia2 = function(content,fn,time){
	var options = {};
	if(typeof(content) == 'string'){
		options.content = content;
		options.fn = fn || function(){};
	}else{
		options = content;
	}
	options.content 	= options.content || '保存失败！';
	options.time		= options.time 	|| 2;
	options.fn			= options.fn 		|| function(){};
	var dia = M.alert({
		content: options.content,
		icon: 'error',
		drag:false,
		fixed:true,
		time:options.time, 
		cb:function(){
			options.fn();
		}
	});
 }

 faldia3 = function(content,fn,time){
	var options = {};
	if(typeof(content) == 'string'){
		options.content = content;
		options.fn = fn || function(){};
	}else{
		options = content;
	}
	options.content 	= options.content || '保存失败！';
	options.time		= options.time 	|| 2;
	options.fn			= options.fn 		|| function(){};
	var dia = art.dialog({
		content: options.content+'<br/>'+options.time +'秒后窗口自动关闭',
		icon: 'error',
		drag:false,
		fixed:true,
		time:options.time ,
		close:function(){
			options.fn();
		}
	});
 } 

  //操作失败对话框
 warndia = function(content,fn,time){
	var options = {}; 
	if(typeof(content) == 'string'){
		options.content = content;
		options.fn = fn || function(){};
	}else{
		options = content;
	}
	options.content 	= options.content || '';
	options.time		= options.time 	|| 2;
	options.fn			= options.fn 		|| function(){};
	var delay;
	delay = function(ms, func) {
	    return setTimeout(func, ms);
	};
	toastr.options = { 
	    positionClass: 'toast-bottom-left'
	};
	delay(10, function() {
	    return toastr.warning(options.content);
	}); 
    setTimeout(options.fn,2000); 
 }

   //操作失败对话框
 infodia = function(content,fn,time){
	var options = {}; 
	if(typeof(content) == 'string'){
		options.content = content;
		options.fn = fn || function(){};
	}else{
		options = content;
	}
	options.content 	= options.content || '保存失败！';
	options.time		= options.time 	|| 2;
	options.fn			= options.fn 		|| function(){};
	var delay;
	delay = function(ms, func) {
	    return setTimeout(func, ms);
	};
	toastr.options = { 
	    positionClass: 'toast-bottom-left'
	};
	delay(10, function() {
	    return toastr.info(options.content);
	}); 
    setTimeout(options.fn,2000); 
 }

 //系统登录对话框
 userLogin = function(){
 	var dialog = art.dialog({id: 'UserLogin_DH',title: '用户登录'});
  
	$.ajax({
	    url: INDEX_URL+'/global_user_artlogin',
	    success: function (data) { 
	        dialog.content(data);
	    },
	    cache: false
	})
	 	
 }

 //提示剩余字数的插件

$ .fn .numTextarea  = function(options){
	var options = options;
	options = $.extend({},$ .fn .numTextarea .defaultOptions ,options);
	return this .each(function(){
		$ .fn .numTextarea .init .apply(this,[options]);
	});
}

$ .fn .numTextarea .init = function (options){
	var blog_input = $(this);
	
	var weibo_text_num = $(options.display);
	if(blog_input .data('first'))
	weibo_text_num.html('0/'+options .max);
	
	blog_input .unbind('keyup') .keyup(function(){
		var weibo_num = options .max - blog_input .halfLen();
		if(weibo_num>=0){
			weibo_text_num.html(blog_input .halfLen()+'/'+options .max);
		}else{
			weibo_text_num.html('<font color=red>超出'+(-weibo_num)+'</font>');
		}
	});
	$(this) .val(options .text);
	blog_input .data('first',true);
	blog_input .unbind('click') .click(function(){
		if($(this) .data('first')&&options.clear){			
			$(this) .val(options .text);
			$(this) .data('first',false);
		}

	});
	blog_input .unbind('blur') .blur(function(){
		if($(this) .val() .length == 0){
			$(this) .val(options .text);
			$(this) .data('first',true);
		} 
	});
};

$ .fn .numTextarea .defaultOptions ={
	max : 140 ,
	display : '',
	text : '',
	btn :'',
	clear:true
};
$.fn .halfLen = function () {
	return parseInt(($(this) .val() .replace(/[^\x00-\xff]/g, '__').length +1 )/2);
}


 //动态表单字段收集器
 //(function($){
	$ .fn .autoFormer = function(options){
		return $.each(this,function(v){
			fields = $(this) .find('.autoFormer');
			fields .each(function(){
				/*
				reg = /_.+/ ;
				name = $(this).attr('name');
				name_value = name.match(reg)[0];
				name_value = name_value.slice(1);
				$(this).attr('name',name_value);
				*/
			});
			$('._fieldlist_selectx').each(function(){
				select = $(this).find('select');
				var val;
				select.each(function(){
					if($(this).val()!='_null'){
						if(val == undefined) val = $(this).val();
						else val += '.'+$(this).val();
					}
				});
				var parent_attr_div = $(this). parents('.autoFormerAttrDiv');
				if(parent_attr_div.length){
					$('<input  type="hidden" name="'+ parent_attr_div .attr('field_name')+'"/>') .val(val) .appendTo(this);
				}else{
					$('<input  type="hidden" name="'+$(this).attr('name')+'"/>').val(val).appendTo(this);
				}
			});
		});
	}
// })(jQuery);

$(function(){
	//所有submit_button 绑定提交事件
	$('.submit_button') .click(function(){
		$(this) .parents('form') .submit();
		return false;
	});
});



var selectx_init = function(){
	$(this) .selectx();
}
/*
$(function(){
	$('._fieldlist_selectx').selectx();
});
*/




//IE下没有console
if(console === undefined){
	console = {
		log : function(text){
		}
	}
}



/*顶部固定*/

function cap_fix(){
	var str='<!--[if IE 6]><style>*html,*html body{background-image:url(about:blank);background-attachment:fixed;}.lay_top{position:absolute;bottom:auto;top:expression(eval(document.documentElement.scrollTop));}</style><![endif]-->'
	$("head").append(str);	
}

cap_fix();


/*发送短消息*/
sent_msg = function(userid,username,value){
	var username = username || 'TA';
	var userid   = userid   || 0;
	var value    = value    || '';
	art.dialog({
		id:"dia_msg_contentd",
		title:'给'+username+'发送短消息',
		content:'<div ><textarea id="dia_msg_content" style="font-size:13px; line-height:22px; padding:4px; color:#444; width:350px; height:80px">'+value+'</textarea></div>',
		ok:function(){
			$.post(INDEX_URL+'/sns_userrelation_sendMessage',{'userid':userid,'content':$('textarea#dia_msg_content').val()},function(data){
				if(data.success){
					sucdia('发送成功');
				}else{
					faldia(data.msg);
					return false;
				}
			},'json');
		},
		okVal:'发送',
		cancel:function(){
		},
		cancelVal:'取消'
	})
}
send_msg = sent_msg;

friend_add = function(userid,username,value){
	var username = username || 'TA';
	var userid   = userid   || 0;
	var value    = value    || '';
	if(!userid) faldia('没有指定好友');
	
	art.dialog({
		id:"dia_friend_contentd",
		title:'加'+username+'为好友',
		content:'<div ><textarea id="dia_friend_content" style="font-size:13px; line-height:22px; padding:4px; color:#444; width:350px; height:80px">'+value+'</textarea></div>',
		ok:function(){
			$.post(INDEX_URL+'/sns_userrelation_friendApply',{userid:userid,content:$('textarea#dia_friend_content').val()},function(data){
				if(data.success){
					sucdia('验证信息发送成功');
				}else{
					faldia(data.msg);
					return false;
				}
			},'json');
		},
		okVal:'发送',
		cancel:function(){
		},
		cancelVal:'取消'
	})
}
sent_weibo = function(username,value){
	if(!username) faldia('没有指定TA');
	var value    = value    || '';
	
	
	art.dialog({
		id:"dia_weibo_contentd",
		title:'对 '+username+' 说',
		content:'<div ><textarea id="dia_weibo_content" style="font-size:13px; line-height:22px; padding:4px; color:#444; width:350px; height:80px">'+value+'</textarea></div>',
		ok:function(){
			$.post(INDEX_URL+'/sns_index_addSns',{content:'@'+ username +'： '+$('textarea#dia_weibo_content').val()},function(data){
				if(data.success){
					sucdia('信息发送成功！');
				}else{
					faldia(data.msg);
					return false;
				}
			},'json');
		},
		okVal:'发送',
		cancel:function(){
		},
		cancelVal:'取消'
	})
}

function fansAdd(userid){
	userid = userid;
	if(userid==0) return false;
	$.post( INDEX_URL + 'sns_userrelation_fansadd',{userid:userid},function(data){
		if(data.success){
			sucdia('关注成功');
		}else{
			faldia(data.msg);
		}
	},'json');
 
}
//添加收藏
function collection_add(collect){
	if(!collect.url){
		faldia('url不能为空');
		return false;
	}
	if(!collect.title){
		faldia('标题不能为空');
		return false;
	}
	$.post(INDEX_URL+'/collection_index_collectionadd',{collect:collect},function(data){
		if(data.success){
			sucdia('收藏成功');
		}else{
			faldia(data.msg);
		}
		

	},'json')
	return false;
}
//添加收藏
function addFavorite(){
    if (document.all){
        try{
            window.external.addFavorite(window.location.href,document.title);
        }catch(e){
            alert( "加入收藏失败，请使用Ctrl+D进行添加" );
        }
        
    }else if (window.sidebar){
        window.sidebar.addPanel(document.title, window.location.href, "");
     }else{
        alert( "加入收藏失败，请使用Ctrl+D进行添加" );
    }
}
//设为首页                
function setHomepage(){
    if (document.all){
        document.body.style.behavior='url(#default#homepage)';
          document.body.setHomePage(window.location.href);
    }else if (window.sidebar){
        if(window.netscape){
            try{
                netscape.security.PrivilegeManager.enablePrivilege("UniversalXPConnect");
            }catch (e){
                alert( "该操作被浏览器拒绝，如果想启用该功能，请在地址栏内输入 about:config,然后将项 signed.applets.codebase_principal_support 值该为true" );
            }
        }
        var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components. interfaces.nsIPrefBranch);
        prefs.setCharPref('browser.startup.homepage',window.location.href);
    }else{
        alert('您的浏览器不支持自动自动设置首页, 请使用浏览器菜单手动设置!');
    }
}

//商家关注
function groupFansAdd(groupid){
	var a_lock = false;
	if(!a_lock){
		a_lock = true;
		$.post(INDEX_URL+"/c2c_grouprelation_fansadd",{groupid:groupid},function(data){
			a_lock = false;
			if(data.success){
				alert('添加成功');
			}else{
				alert(data.msg)
			}
		},'json');
	}
}
//动态加载js
function loagJs(b, c) {
	var a = document.createElement("script");
	a.setAttribute("type", "text/javascript");
	a.setAttribute("src", b);
	a.onload = a.onreadystatechange = function() {
		if (!this.readyState || this.readyState == "loaded" || this.readyState == "complete") {
			a.onload = a.onreadystatechange = null;
			if (typeof c === "function") {
				c(b, true)
			}
		}
	};
	a.onerror = function(d) {
		if (typeof c === "function") {
			c(b, false)
		}
	};
	document.getElementsByTagName("head")[0].appendChild(a)
};



//让表单中同一行的div高度一致；
waitTillLoad = function(jqueryDom,callback,timeInterval){
	if(typeof(timeInterval) == 'undefined') timeInterval = 100;
	var intervalId = setInterval(function(){
		if(jqueryDom.length>0){
			clearInterval(intervalId);
			callback ();
		}
	},timeInterval);
}
/*
waitTillLoad($(".dh-formList-item:eq(0)").children , function(){
	$(".dh-formList-item") .each(function(index, element) {
		var h=$(this).height()-20;
		$(this).children(".dh-formList-title").height(h).css("line-height",h+"px");
		$(this).children(".dh-formList-con").height(h).find(".vm").css("marginTop",(h-27)/2);;
		$(this).children(".dh-formList-info").height(h).css("line-height",h+"px");
	});
	
});
*/


jsImport = function(src,cache){
	if(typeof cache == 'undefined') {
		if(typeof DEBUG == 'undefined') cache = false;
		else  cache = DEBUG;
	}
	switch(src){
		case 'dhadmin.list':{
			jsImport('artdialog',cache);
			importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/DhContent/ContentContainer.js',cache);
			importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/DhContent/List.js',cache);
			improtStyle(COMMON_STYLE_ROOT+'/2013admin/css/g.css');
			improtStyle(COMMON_STYLE_ROOT+'/2013admin/css/g_mod.css');
			break;
		}
		case 'dhadmin.tree' :{
			jsImport('artdialog',cache);
			importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/DhContent/ContentContainer.js',cache);
			importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/DhContent/Tree.js',cache);
			improtStyle(COMMON_STYLE_ROOT+'/2013admin/css/g.css');
			improtStyle(COMMON_STYLE_ROOT+'/2013admin/css/g_mod.css');
			break;
		}
		case 'dhadmin.former':{
			if(typeof $ .fn .validate == 'undefined')   importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/jquery.validate.js',false);
			if(typeof $ .fn .ajaxSubmit == 'undefined') importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/jquery.form.min.js',false);
			importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/DhFormer.js',cache);
			improtStyle(COMMON_STYLE_ROOT+'/2013admin/css/g.css');
			improtStyle(COMMON_STYLE_ROOT+'/2013admin/css/g_mod.css');
			break;
		}
		case 'artdialog'	:{
			if(typeof art !='undefined') return ;
			importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/artDialog4.1.7/artDialog.js',false);
			importJavaScript(COMMON_STYLE_ROOT+'/2013admin/js/artDialog4.1.7/plugins/iframeTools.source.js',false);
			improtStyle		(COMMON_STYLE_ROOT+'/2013admin/js/artDialog4.1.7/skins/default.css');
			break; 
		}
		default	:{
			console .log('import js not found ' + src);
			throw 'import js : source type not found ' + src;
		}
	}
}


importJavaScript = function(src,cache){
	if(typeof cache == 'undefined') cache == false;
	if($('script[src="'+src+'"]') .length == 0 ) document.write('<script type="text/javascript" src="'+src+'"></script>');
}
improtStyle		= function(link){
	if($('link[href="'+link+'"]') .length == 0 )  document.write('<link rel="stylesheet" type="text/css" href="'+link+'" />');
}

//对话框

if(typeof art == "undefined"){
	importJavaScript('/material/common/2013admin/js/artDialog4.1.7/artDialog.js',false);
	importJavaScript('/material/common/2013admin/js/artDialog4.1.7/plugins/iframeTools.source.js',false);
	improtStyle		('/material/common/2013admin/js/artDialog4.1.7/skins/blue.css');
} 