(function($) {
  $.fn.extend({
    searchList: function(options) {
        var defaults = {
            list:'#search-list',   
            clear:'',
            keyMove:true, 
            showHis:true,
            isPerson:false,
            viewType:1,  //2为全球企业       
        };
        var o = $.extend(defaults, options);

        var $sk = $(this);
        var $list = $(o.list);
        var $clear;
        var mTimeout;
        var searchKey;
        
        $sk.on('input',function(e){
            $list.hide();
            getSearchList(1);
            if(o.clear){
                setClear();
            }
        });
        $sk.on('click',function(e){
            var isIE = (!!window.ActiveXObject || "ActiveXObject" in window);
            if(isIE && $sk.val()==''){
                $sk.attr('placeholder','');
            }
            getSearchList(2);
        });

        if(o.clear){
            $clear = $(o.clear);
            setClear();
            $clear.on('click',function(e){
                $sk.val('');
                $sk.focus();
                $clear.hide();
            });
        }
 
        function getSearchList(eventType){
            searchKey = $sk.val();
            if(searchKey!='' && searchKey.length>=2){
                if(o.viewType!=2){
                    mind(searchKey);
                }
            }else if(eventType==2){
                his();
            }
        }

        function mind(searchKey){
            if(mTimeout){
                clearTimeout(mTimeout);
            }
            param = {
                type:'mind',
                searchKey:searchKey,
                searchType:0
            };
            if(o.isPerson){
                param.isPerson=1
            }
            mTimeout = setTimeout(function(){
                $.ajax({
                    type: 'get',
                    url: INDEX_URL + '/gongsi_mindlist',
                    data: param,
                    success: function(html) {
                        if(html && !html.isEmpty()){
                            $list.html(html);
                            $list.show();
                        }
                    }
                })

            },200);
        }

        function his(){
            if(o.showHis){
                $.ajax({
                    url: INDEX_URL + '/gongsi_mindlist',
                    data: {
                        type:'his',
                        viewType:o.viewType
                    },
                    success: function(html) {
                        if(html && !html.isEmpty()){
                            $list.html(html);
                            $list.show();
                        }
                    }
                });
            }   
        }

        

        if(o.keyMove){
            function searchKeyMoveEnd(){
                var obj = $sk[0];
                obj.focus(); 
                var len = obj.value.length; 
                if (document.selection) { 
                    var sel = obj.createTextRange(); 
                    sel.moveStart('character',len); //设置开头的位置
                    sel.collapse(); 
                    sel.select(); 
                } else if (typeof obj.selectionStart == 'number' && typeof obj.selectionEnd == 'number') { 
                    obj.selectionStart = obj.selectionEnd = len; 
                } 
            }
            $sk.on('keydown',function(e){
                var event = e||window.event;
                var keyCode = event.keyCode;//40:下移，38：上移
                var flag = false;
                var listGroup = $list.find('a.list-group-item');
                var selectItem;
                if(!$list.is(':hidden') && (keyCode == 40 || keyCode == 38)){
                    var nextObj;
                    listGroup.each(function(i){
                        if($(this).hasClass('keyMove')){
                            $(this).removeClass('keyMove');
                            if(i != listGroup.length-1 && keyCode == 40){
                                nextObj = listGroup.eq(i+1);
                                flag = true;
                            }
                            if(i != 0 && keyCode == 38){
                                nextObj = listGroup.eq(i-1);
                                flag = true;
                                setTimeout(function() {
                                    searchKeyMoveEnd();
                                }, 100);
                            }
                            return false;//跳出each循环
                        }
                    });
                    if(!flag){
                        var j = keyCode == 40 ? 0 : listGroup.length-1;
                        nextObj = listGroup.eq(j);
                    }
                    nextObj.addClass('keyMove');
                    $sk.val($.trim(nextObj.find('.keyMoveText').text()));
                }
            });

        }

        function setClear(){
            if($sk.val()){
                $clear.show();
            }else{
                $clear.hide();
            }
        }
        return this;
    }
  });

  $.fn.extend({
    searchList: $.fn.searchList
  });

})(jQuery);