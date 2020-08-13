(function($) {
  $.fn.extend({
    phoneSelect: function(options) {
        var defaults = { 
            selected:null
        };
        var o = $.extend(defaults, options);
        var $phoneSelect = $(this);

        

        setPhoneCode();

        function setPhoneCode(){
            $.ajax({
                type: "get",
                url: "/material/theme/chacha/cms/v2/images/phoneCode2.json",
                dataType: "json",
                success: function(data) {
                    var $tabHead = $('<div class="phone_prefix_tab"></div>');
                    var $tabContent = $('<div class="tab-content"></div>');
                    $.each(data,function(i,group){
                        $tabHeadHtml = $('<a data-tabid="phoneSelect_tab_'+group.groupName+'">'+group.groupName+'</a>');
                        $tabHead.append($tabHeadHtml);
                        var $tabHtml = $('<ul class="phone_prefix_ul phoneSelect_tab_'+group.groupName+'"></ul>');
                        $.each(group.countryList,function(j,v){
                            $tabHtml.append('<li value="+'+v.country_code+'"><span> '+v.country_name_cn+'</span>+'+v.country_code+'</li>');
                        });
                        $tabContent.append($tabHtml);
                        if(i==0){
                            $tabHeadHtml.addClass('active');
                            $tabHtml.show();
                        }
                    });
                    $phoneSelect.find('.dropdown-menu').empty();
                    $phoneSelect.find('.dropdown-menu').append($tabHead);
                    $phoneSelect.find('.dropdown-menu').append($tabContent);


                }
            });
        }

        function getCountryGroup(groups,groupName){
            for(var i=0;i<groups.length;i++){
                if(groups[i].groupName==groupName){
                    return groups[i];
                }
            }
        }

        var that = this;
        $phoneSelect.on('click','li',function(){
            var tname = $(this).find('span').text();
            if(tname.length>5){
            tname = tname.substr(0,6)+'…';
            }
            $phoneSelect.find('.phone_prefix').html(tname+' +'+this.value+'<b class="caret text-primary"></b>');
            var width = $phoneSelect.find('.phone_prefix').width(); 
            $phoneSelect.find('.phoneline').css('left',width+18);
            $phoneSelect.prev('.phone_prefix_input').val('+'+this.value);
            $phoneSelect.next().css('padding-left',width+27);
            if(o.selected){
                o.selected(this.value);
            }
        })

        $phoneSelect.on('click','.phone_prefix_tab>a',function(e){
            e.stopPropagation();
            var tabId = $(this).attr('data-tabid');
            $phoneSelect.find('a[data-tabid='+tabId+']').siblings().removeClass('active');
            $phoneSelect.find('a[data-tabid='+tabId+']').addClass('active');
            $phoneSelect.find('.'+tabId).siblings().hide();
            $phoneSelect.find('.'+tabId).show();
        })
        return this;
    }
  });

  $.fn.extend({
    phoneSelect: $.fn.phoneSelect
  });

})(jQuery);