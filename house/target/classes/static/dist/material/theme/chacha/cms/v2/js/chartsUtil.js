var chartUtil = {
    getTitleOption : function(name){
        return {
            text: name,
            subtext:'',
            x: 10,
            y: 10,
            textStyle: {
                color:"#333333",
                fontSize:13,
                fontWeight:'normal'
            }
            

        }
    },
    getEchart : function(){
        if($('#fullChart').length==0){
            $(document.body).append('<div id="fullChart" style="position: fixed; top:0px; left: 0px; right: 0px; bottom: 0px; background: #fff; z-index: 1200;"><div class="fullChartContain" style="width:100%;height:100%"></div></div>');
        }
        $('#fullChart').show();
        return echarts.init($('#fullChart .fullChartContain')[0]);
    },
    transPieData : function(data){
        data = data.sort(function (a, b) {
                return b.Count - a.Count;
        });
        if(data.length>6){
            data = data.splice(0,6);
        }
        var pieData = [];
        for(var i=0; i<data.length; i++){
            if(data[i].Desc==null || data[i].Desc==""){
                data[i].Desc = "其他";
            }
            var obj = {
                value: data[i].Count,
                name: data[i].Desc.replace(/(.{5})(?=.)/g, '$1\n'),
                category: data[i].Category || ''
            };
            pieData.push(obj)
        }
        return pieData;
    },
    transMapData : function(data){
        var mapData = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].Desc == null || data[i].Desc == "") {
                data[i].Desc = "其它";
            }
            var obj = {
                value: data[i].Count,
                name: data[i].Desc,
            };
            mapData.push(obj);
        }
        return mapData;
    },
    transMapDataN : function(data){
        var mapData = [];
        for (var i = 0; i < data.length; i++) {
            if (data[i].desc == null || data[i].desc == "") {
                data[i].desc = "其它";
            }
            var obj = {
                value: data[i].count,
                name: data[i].desc,
            };
            mapData.push(obj);
        }
        return mapData;
    },
    transBarData:function(data){
        
        var xData=[];
        var yData=[];

        for(var i=0; i<data.length; i++){
            xData.push(data[i].Desc);
            yData.push(data[i].Count);
        }

        return {
            xData:xData,
            yData:yData
        }

    },
    transBarDataN:function(data){
        
        var xData=[];
        var yData=[];

        for(var i=0; i<data.length; i++){
            xData.push(data[i].desc);
            yData.push(data[i].count);
        }

        return {
            xData:xData,
            yData:yData
        }

    },
    transBarHorData:function(data){
        data = data.sort(function (a, b) {
                return a.Count - b.Count;
        });
        var xData=[];
        var yData=[];

        for(var i=0; i<data.length; i++){
            xData.push(data[i].Desc.replace(/(.{5})(?=.)/g, '$1\n'));
            yData.push(data[i].Count);
        }

        return {
            xData:xData,
            yData:yData
        }

    },
    transBarDataYear:function(data){
        data = data.sort(function (a, b) {
                return a.Value > b.Value;
        });
        
        var xData=[];
        var yData=[];

        for(var i=0; i<data.length; i++){
            if(data[i].Value>=2000&&data[i].Value<=2016){
                xData.push(data[i].Value);
                yData.push(data[i].Count);
            }
        }

        return {
            xData:xData,
            yData:yData
        }

    },
    /**
    * 绘制地图
    * @param  {[data]} 数据列表
    * @param  {[domId]} 要初始化的domId
    * @param  {[type]} 图表样式，默认为0
    * @param  {[name]} 图表的title，默认为空
    */
    drawMap : function(data, domId, type,name) {
        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById(domId));
        var maxValue = 0;
        for (var i = 0; i < data.length; i++) {
            if(data[i].value>maxValue){
                maxValue = data[i].value;
            }
        }


        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            backgroundColor: '#ffffff',
            tooltip: {
                trigger: 'item'
            },
            visualMap: {
                min: 0,
                max: maxValue,
                left: 40,
                top: 90,
                text: ['高', '低'], // 文本，默认为数值文本
                calculable: true,
                inRange:{
                    color:['#BFEFFF', '#128BED']
                }
            },
            toolbox: {
                right:18,
                top:5,
                feature: {
                    saveAsImage: {}
                }
            },
            //color:['#128BED','#5CACEE','#63B8FF','#7EC0EE','#87CEEB','#97FFFF'],
            series: [{
                name: name,
                type: 'map',
                top:60,
                left:100,
                right:60,
                mapType: 'china',
                itemStyle:{
                    emphasis:{
                        areaColor:new echarts.graphic.LinearGradient(0, 0, 0, 1, [{
                              offset: 0, color: '#00EEEE' // 0% 处的颜色
                            }, {
                              offset: 1, color: '#00FF7F' // 100% 处的颜色
                            }], false),
                    }
                },
                label: {
                    normal: {
                        show: false
                    },
                    emphasis: {
                        show: true
                    }
                },
                data: data

            }]
        };
        if(type==7){
            option.series[0].label.normal.show = true;
        }
        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
        return myChart;
    },
    drawPie : function(data, domId, type ,name){
        var myChart = echarts.init(document.getElementById(domId));
        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            backgroundColor: '#ffffff',
            tooltip : {
                trigger: 'item',
            },
            toolbox: {
                right:18,
                top:5,
                feature: {
                    saveAsImage: {}
                }
            },
            color:['rgb(81, 130, 228)','rgb(81, 180, 241)','rgb(105, 212, 219)','rgb(63, 178, 126)','rgb(155, 204, 102)','rgb(200, 203, 74)'],
            series : [
                {
                    name:name,
                    type:'pie',
                    radius : '60%',
                    center: ['50%', '50%'],
                    data:data,
                    selectedOffset: 2,
                    roseType:false,
                    label: {
                        normal:{
                            textStyle: {
                                fontSize: 12
                            },
                            formatter: '{b}'
                        }
                    },
                    labelLine: {
                        normal: {
                            smooth: 0.2,
                            length: 10,
                            length2: 20
                        }
                    },
                    itemStyle:{
                        normal: {
                            
                        }
                    }
                }
            ]
        };
        if(type==11){
            option.series[0].name='数量（总数）';
            option.series[0].radius='40%';
            option.series[0].label.normal.textStyle.color='#666';
            option.toolbox = {
                feature: {
                    saveAsImage: {}
                }
            };
        }

        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
        return myChart;
    },
    drawPieFull : function(data, domId, type ,name){
        var myChart = echarts.init(document.getElementById(domId));
        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            backgroundColor: '#ffffff',
            tooltip : {
                trigger: 'item',
            },
            color:['#2C7CE8','#7DB4FF','#00B0FF','#3088FF','#1565C0','#42A5F5','#276DCC','#128BED','#90CAF9','#0091EA','#64B5F6','#0288D1','#03A9F4','#1E88E5',' #29B6F6','#2979FF','#448AFF','#2962FF','#4FC3F7','#2196F3'],
            series : [
                {
                    name:name,
                    type:'pie',
                    radius : '60%',
                    center: ['50%', '55%'],
                    data:data,
                    selectedOffset: 2,
                    roseType:false,
                    label: {
                        normal:{
                            textStyle: {
                                fontSize: 12
                            },
                            formatter: '{b}'
                        }
                    },
                    labelLine: {
                        normal: {
                            smooth: 0.2,
                            length: 10,
                            length2: 20
                        }
                    },
                    itemStyle:{
                        normal: {
                            
                        }
                    }
                }
            ]
        };
        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
        return myChart;
    },

    drawPieDouble : function(data, domId, type ,name){
        var myChart = echarts.init(document.getElementById(domId));
        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            backgroundColor: '#ffffff',
            tooltip: {
                trigger: 'item',
                formatter: "{a} <br/>{b}: {c} ({d}%)"
            },
            toolbox: {
                right:18,
                top:5,
                feature: {
                    saveAsImage: {}
                }
            },
            legend: {
                orient: 'vertical',
                x: 'right',
                y: 'center',
                data:[]
            },
            series : [
                {
                    color:['#61a5e8','#45c2ce','#4cd485','#5c8ce4','#58b7e8','#128bed','#2C7CE8'],
                    name:data.data1.name,
                    type:'pie',
                    selectedMode: 'single',
                    radius: [0, '35%'],
                    center: ['40%', '55%'],
                    label: {
                        normal: {
                            show:false,
                            position: 'inner'
                        }
                    },
                    labelLine: {
                        normal: {
                            show: false
                        }
                    },
                    data:data.data1.value
                },
                {
                    color:['#7ecf51','#eecb5f','#e3935d','#e16757','#4cd593','#ecb556','#bac895','#da6464','#e899b6','#e6a75e','#dbd942','#f18b8b','#9570e5'],
                    name:data.data2.name,
                    type:'pie',
                    radius: ['42%', '65%'],
                    center: ['40%', '55%'],
                    label: {
                        normal:{
                            show:false,
                        }
                        
                    },
                    data:data.data2.value
                }
            ]
        };

        var legendData = [];
        
        for(var i=0;i<data.data2.value.length;i++){
            legendData.push({
                name:data.data2.value[i].name,
                icon: 'roundRect',

            });
        }

        for(var i=0;i<data.data1.value.length;i++){
            legendData.push({
                name:data.data1.value[i].name,
                icon: 'circle',
 
            });
        }



        option.legend.data = legendData;

        

        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
        return myChart;
    },
    /**
    * 绘制柱状图
    * @param  {[data]} 数据列表
    * @param  {[domId]} 要初始化的domId
    * @param  {[type]} 图表样式，默认为0   5为12条数据
    * @param  {[name]} 图表的title，默认为空
    */
    drawBar : function(data, domId, type,name) {


        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById(domId));
        if(type==1){
            if(data.xData.length>5){
                data.xNewData = data.xData.concat().splice(data.xData.length-5,data.xData.length);
                data.yNewData = data.yData.concat().splice(data.yData.length-5,data.yData.length);
            }else{
                data.xNewData = data.xData;
                data.yNewData = data.yData;
            }
        }else{
            data.xNewData = data.xData;
            data.yNewData = data.yData;
        }



        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            tooltip: {
                trigger: 'item'
            },
            grid:{
                top:100,
                right:30,
                bottom:45,
                left:45,
                backgroundColor:"#fbfbfb"
            },
            toolbox: {
                right:18,
                top:5,
                feature: {
                    saveAsImage: {},
                    // myTool1: {
                    //     show: true,
                    //     title: '自定义扩展方法1',
                    //     icon: 'path://M432.45,595.444c0,2.177-4.661,6.82-11.305,6.82c-6.475,0-11.306-4.567-11.306-6.82s4.852-6.812,11.306-6.812C427.841,588.632,432.452,593.191,432.45,595.444L432.45,595.444z M421.155,589.876c-3.009,0-5.448,2.495-5.448,5.572s2.439,5.572,5.448,5.572c3.01,0,5.449-2.495,5.449-5.572C426.604,592.371,424.165,589.876,421.155,589.876L421.155,589.876z M421.146,591.891c-1.916,0-3.47,1.589-3.47,3.549c0,1.959,1.554,3.548,3.47,3.548s3.469-1.589,3.469-3.548C424.614,593.479,423.062,591.891,421.146,591.891L421.146,591.891zM421.146,591.891',
                    //     onclick: function (){
                    //         var ech = chartUtil.getEchart();
                    //         var opt = option;
                    //         option.toolbox.feature.myTool1={
                    //             show: true,
                    //             title: '自定义扩展方法1',
                    //             icon:'M364.376,3.836C361.616,0.968,358.64,0,354.708,0H229.016C221.328,0,216,5.528,216,13.212v10.952C216,32.116,221.06,40,229.012,40h71.26L40,300.368v-71.6C40,220.804,32.024,216,24.072,216H13.12C5.428,216,0,221.08,0,228.764v125.744c0,3.936,0.92,7.008,3.676,9.656c2.76,2.868,5.788,3.836,9.72,3.836h125.696c7.688,0,12.912-5.524,12.912-13.212v-10.952c0-7.952-4.952-15.836-12.912-15.836H65.756L328,65.564v73.68c0,3.836,2.304,6.624,5.04,9.36c2.732,2.728,7.152,3.4,10.992,3.4h10.952c3.848,0,6.756-0.672,9.484-3.408c2.736-2.728,3.532-5.516,3.532-9.352V13.492C368,9.564,367.132,6.488,364.376,3.836z',
                    //             onclick:function(){
                    //                 $('#fullChart').hide();
                    //             }
                    //         };
                    //         option.xAxis.data = data.xData;
                    //         option.series[0].data = data.yData;
                    //         setTimeout(function() {
                    //             ech.setOption(opt);
                    //         }, 100);
                    //     }
                    // },
                }
            },
            color:['#67aef5'],
            xAxis: {
                type: 'category',
                boundaryGap: true,
                axisLine:{
                    lineStyle:{
                        color:'#333',
                        width:0
                    }
                },
                axisLine:{
                    show:true
                },
                axisTick:{
                    show:false
                },
                axisLabel:{
                    interval:0,
                    rotate:0
                },
                splitLine:{
                    show:false
                },
                data: data.xNewData
            },
            yAxis: {
                axisLine:{
                    show:true
                },
                splitLine:{
                    show:false,
                    lineStyle: {
                        color: "#dbdbdb",
                        width: 0.5
                    }
                },
                axisTick:{
                    show:true
                }
            },
            series: [{
                name: '数量',
                type: 'bar',
                barMaxWidth:30,
                label:{
                    normal:{
                        show:true,
                        position:'top'
                    }
                },
                data: data.yNewData
            }]
        };

        
        var maxDataLength = 0;
        for(var i=0;i<data.xData.length;i++){
            if(data.xData[i].length>maxDataLength) maxDataLength = data.xData[i].length;
        }

        if($('#'+domId).width()<600){
            if(maxDataLength>5&&maxDataLength<=11){
                if(data.xData.length>=5){
                    option.xAxis.axisLabel.rotate = 20;
                    option.grid.bottom = 75;
                }
            }else if(maxDataLength>13){
                if(data.xData.length>=3){
                    option.xAxis.axisLabel.rotate = 20;
                    option.grid.bottom = 75;
                }
            }else{
                if(data.xData.length>6){
                    option.xAxis.axisLabel.rotate = 20;
                    option.grid.bottom = 75;
                }
            }

        }else{
            if(maxDataLength>5){
                if(data.xData.length>6){
                    option.xAxis.axisLabel.rotate = 20;
                    option.grid.bottom = 75;
                }
            }else{
                if(data.xData.length>12){
                    option.xAxis.axisLabel.rotate = 20;
                    option.grid.bottom = 75;
                }
            }
        }
        if(data.xData.length<=3 && maxDataLength<=10){
            option.xAxis.axisLabel.rotate = 0;
        }
        if(type==1 && name){
            option.series[0].name=name;
        }
        if(type==11){
            option.xAxis.boundaryGap = false;
            option.toolbox = {
                feature: {
                    saveAsImage: {}
                }
            };
            option.xAxis = {
                show:false,
            }
            option.grid = {
                top:30,
                right:20,
                bottom:15,
                left:95,
            }
            option.yAxis = {
                type: 'category',
                axisLine:{
                    show:false
                },
                axisTick: {
                    show: false
                },
                axisLabel:{
                    interval:0,
                    margin:90,
                    textStyle:{
                        color:'#666',
                        align:'left'
                    },
                },
                data: data.xData
            };
            option.series[0].barMaxWidth = 15;
            option.series[0].label.normal.position = 'right';
            option.series[0].name='数量（企业数）'

        }

        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
        return myChart;
    },
    /**
    * 绘制柱状图
    * @param  {[data]} 数据列表
    * @param  {[domId]} 要初始化的domId
    * @param  {[type]} 图表样式，默认为0   5为12条数据
    * @param  {[name]} 图表的title，默认为空
    */
    drawBarHor : function(data, domId, type,name) {

        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById(domId));
        
        if(data.xData.length>6){
            data.xData = data.xData.splice(data.xData.length-6,data.xData.length);
            data.yData = data.yData.splice(data.yData.length-6,data.yData.length);
        }
    
        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            tooltip: {
                trigger: 'item'
            },
            toolbox: {
                right:18,
                top:5,
                feature: {
                    saveAsImage: {},
                }
            },
            grid:{
                top:80,
                right:20,
                bottom:40,
                left:85,
                backgroundColor:"#fbfbfb"
            },
            yAxis: {
                type: 'category',
                boundaryGap: false,
                interval:20,
                axisLine:{
                    lineStyle:{
                        color:'#333',
                        width:0
                    }

                },
                axisTick:{
                    show:false
                },
                axisLabel:{
                    interval:0,
                },
                splitLine:{
                    show:false,
                },
                data: data.xData
            },
            color:['#128bed','#298212'],
            xAxis: {
                show:false,
                axisLine:{
                    show:false
                },
                splitLine:{
                    show:false,
                    lineStyle: {
                        color: "#dbdbdb",
                        width: 0.5
                    }
                },
                axisTick:{
                    show:false
                }
            },
            series: [{
                name: '数量',
                type: 'bar',
                barMaxWidth:30,
                label:{
                    normal:{
                        show:true,
                        formatter:function(param){
                            return param.value!=0?param.value:'';
                        },
                        position:'right'
                    }
                },
                data: []
            }]
        };

        var color = ['#2C7CE8','#7DB4FF','#00B0FF','#3088FF','#1565C0','#42A5F5','#276DCC','#128BED','#90CAF9','#0091EA','#64B5F6','#0288D1','#03A9F4','#1E88E5',' #29B6F6','#2979FF','#448AFF','#2962FF','#4FC3F7','#2196F3'];

        
        for(var i=0;i<data.yData.length;i++){
            option.series[0].data.push({
                value:data.yData[i],
                itemStyle:{
                    normal: { 
                        color: color[i]
                    }
                }
            });
        }
        
        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
        return myChart;
    },
    /**
    * 绘制柱状图
    * @param  {[data]} 数据列表
    * @param  {[domId]} 要初始化的domId
    * @param  {[type]} 图表样式，默认为0   5为12条数据
    * @param  {[name]} 图表的title，默认为空
    */
    drawBarMuti : function(data, domId, type,name) {


        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById(domId));
        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            tooltip: {
                trigger: 'axis',
                axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                    type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                }
            },
            toolbox: {
                right:18,
                top:5,
                feature: {
                    saveAsImage: {}
                }
            },
            grid:{
                top:60,
                right:30,
                bottom:75,
                left:50,
                backgroundColor:"#fbfbfb"
            },
            color:['#61aef5','#84db56','#f09b62','#ee7777','#9e77e2'],
            xAxis: {
                type: 'category',
                boundaryGap: true,
                axisLine:{
                    lineStyle:{
                        color:'#333',
                        width:0
                    }
                },
                axisLine:{
                    show:true
                },
                axisTick:{
                    show:false
                },
                axisLabel:{
                    interval:0,
                    //rotate:20
                },
                splitLine:{
                    show:false
                },
                data: data.xData
            },
            yAxis: {
                axisLine:{
                    show:true
                },
                splitLine:{
                    show:false,
                    lineStyle: {
                        color: "#dbdbdb",
                        width: 0.5
                    }
                },
                axisTick:{
                    show:true
                }
            },
            series: []
        };

        var legendData = [];

        for(var i=0;i<data.yDatas.length;i++){
            option.series.push({
                name: data.yDatas[i].name,
                type: 'bar',
                barMaxWidth:24,
                label:{
                    normal:{
                        show:true,
                        formatter:function(param){
                            return param.value!=0?param.value:'';
                        },
                        position:'top'
                    }
                },
                barGap:0,
                data: data.yDatas[i].value
            })
            legendData.push(data.yDatas[i].name);
        }

        option.legend={
            itemGap:6,
            data:legendData,
            bottom:'10'
        };

        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
        return myChart;
    },
    /**
    * 绘制增长柱状图
    * @param  {[data]} 数据列表
    * @param  {[domId]} 要初始化的domId
    * @param  {[type]} 图表样式，默认为0   5为12条数据
    * @param  {[name]} 图表的title，默认为空
    */
    drawGrowthBar : function(data, domId, type,name) {
        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById(domId));
       
        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            tooltip: {
                trigger: 'item'
            },
            grid:{
                top:100,
                right:100,
                bottom:100,
                left:100,
                backgroundColor:"#fbfbfb"
            },
            xAxis: {
                type: 'category',
                boundaryGap: true,
                axisLine:{
                    lineStyle:{
                        color:'#333',
                        width:0
                    }

                },
                axisTick:{
                    show:false
                },
                splitLine:{
                    show:true
                },
                data: data.years
            },
            yAxis: [
                {
                    type: 'value',
                    name: '企业数',
                    axisLine:{
                        show:false
                    },
                    splitLine:{
                        show:true,
                        lineStyle: {
                            color: "#dbdbdb",
                            width: 0.5
                        }
                    },
                    axisTick:{
                        show:false
                    }
                },
                {
                    type: 'value',
                    name: '增长率（%）',
                    axisLine:{
                        show:false
                    },
                    splitLine:{
                        show:true,
                        lineStyle: {
                            color: "#dbdbdb",
                            width: 0.5
                        }
                    },
                    axisTick:{
                        show:false
                    }
                }
            ],
            series: [{
                name: '企业数',
                type: 'bar',

                label:{
                    normal:{
                        show:true,
                        position:'top'
                    }
                },
                data: data.nums
            },{
                name: '增长率',          
                type:'line',
                yAxisIndex: 1,
                data: data.growths
            }]
        };

        if(type==1||type==5||type==8){
            option.color = ["#128BED",'#005fac']; 
            option.tooltip = {
                trigger: 'item',
                borderColor: '#128BED',
                borderWidth: 1,
                textStyle: {
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 'lighter'
                }
            };
        }

        if(type==8){
            option.xAxis.axisLabel.rotate = 20;
        }
        myChart.setOption(option);
        return myChart;
    },
    /**
    * 绘制结构柱状图
    * @param  {[data]} 数据列表
    * @param  {[domId]} 要初始化的domId
    * @param  {[type]} 图表样式，默认为0   5为12条数据
    * @param  {[name]} 图表的title，默认为空
    */
    drawStructureBar : function(data, domId, type,name){
        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById(domId));
        // 指定图表的配置项和数据
        var option = {
            title : '',
            tooltip: {
                trigger: 'axis',
                axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                    type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                }
            },
            grid:{
                top:100,
                right:50,
                bottom:100,
                left:100,
                backgroundColor:"#fbfbfb"
            },
            xAxis: {
                type: 'category',
                boundaryGap: true,
                data: data.years
            },
            yAxis: [
                {
                    type: 'value',
                    axisLine:{
                        show:false
                    },
                    splitLine:{
                        show:true,
                        lineStyle: {
                            color: "#dbdbdb",
                            width: 0.5
                        }
                    },
                    axisTick:{
                        show:false
                    }
                }
            ],
            color:['rgb(81, 130, 228)','rgb(81, 180, 241)','rgb(105, 212, 219)','rgb(63, 178, 126)','rgb(155, 204, 102)','rgb(247, 203, 74)'], 
            series: data.series
        };

        if(type==1||type==8){
            
            option.tooltip = {
                trigger: 'axis',
                axisPointer : {            // 坐标轴指示器，坐标轴触发有效
                    type : 'shadow'        // 默认为直线，可选为：'line' | 'shadow'
                },
                borderColor: '#128BED',
                borderWidth: 1,
                textStyle: {
                    color: "#fff",
                    fontSize: 12,
                    fontWeight: 'lighter'
                }
            };
        }

        if(type==8){
            option.xAxis.axisLabel.rotate = 20;
        }
        myChart.setOption(option);
        return myChart;
    },
    /**
    * 绘制折线图
    * @param  {[data]} 数据列表
    * @param  {[domId]} 要初始化的domId
    * @param  {[type]} 图表样式，默认为0
    * @param  {[name]} 图表的title，默认为空
    */
    drawLine : function(data, domId, type,name) {

        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById(domId));

        var xData=[];
        var yData=[];

        for(var i=0; i<data.length; i++){
            xData.push(data[i].Value);
            yData.push(data[i].Count);
        }



        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            tooltip: {
                backgroundColor:'rgba(255,255,255,0.7)',
                borderColor: '#128BED',
                borderWidth: 1,
                textStyle:{
                    color:"#128BED",
                    fontSize: 12,
                    fontWeight: 'lighter'
                }
            },
            grid:{
                top:100,
                right:20,
                bottom:100,
                left:100,
                backgroundColor:"#fbfbfb"
            },
            color:["#128BED"],
            xAxis: {
                type: 'category',
                boundaryGap: true,
                axisLine:{
                    lineStyle:{
                        color:'#dbdbdb',
                        width:0
                    }

                },
                axisTick:{
                    show:false
                },
                axisLabel:{
                    interval:0
                },
                splitLine:{
                    show:false
                },
                data: xData
            },
            yAxis: {
                axisLine:{
                    show:false
                },
                splitLine:{
                    show:true,
                    lineStyle: {
                        color: "#dbdbdb",
                        width: 0.5
                    }
                },
                axisTick:{
                    show:false
                }
            },
            series: [{
                name: '数量',
                type: 'bar',
                barWidth:10,
                label:{
                    normal:{
                        show:true,
                        position:'top'
                    }
                },
                data: yData
            }]
        };

        

        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
    },
    /**
    * 绘制雷达图
    * @param  {[data]} 数据列表
    * @param  {[domId]} 要初始化的domId
    * @param  {[type]} 图表样式，默认为0
    * @param  {[name]} 图表的title，默认为空
    */
    drawRadar : function(data, domId, type,name) {

        // 基于准备好的dom，初始化echarts实例
        var myChart = echarts.init(document.getElementById(domId));

        var mapData = [];
        var maxValue = 0;
        for (var i = 0; i < data.length; i++) {
            if (data[i].Desc == null || data[i].Desc == "") {
                data[i].Desc = "其它";
            }
            var obj = {
                value: data[i].Count,
                name: data[i].Desc
            };
            if(data[i].Count>maxValue){
                maxValue = data[i].Count;
            }
            mapData.push(obj)
        }



        // 指定图表的配置项和数据
        var option = {
            title : this.getTitleOption(name),
            backgroundColor: '#ffffff',
            tooltip: {},
            radar: {
                // shape: 'circle',
                indicator: [
                   { name: '信用记录', max: 6500},
                   { name: '财务状况', max: 16000},
                   { name: '创新能力', max: 30000},
                   { name: '企业活力', max: 38000},
                   { name: '组织背景', max: 52000},
                   { name: '经营状况', max: 25000}
                ]
            },
            series: [{
                name: name,
                type: 'radar',
                // areaStyle: {normal: {}},
                data : [
                    {
                        value : [4300, 10000, 28000, 35000, 50000, 19000],
                        name : '预算分配（Allocated Budget）'
                    },
                     {
                        value : [5000, 14000, 28000, 31000, 42000, 21000],
                        name : '实际开销（Actual Spending）'
                    }
                ]
            }]
        };

       

        // 使用刚指定的配置项和数据显示图表。
        myChart.setOption(option);
    },

    /**
    * Dashboard的四个饼
    */
    drawPiePercent:function(remain,total,color,domId){
        var myChart = echarts.init(document.getElementById(domId));   
        myChart.setOption({
            color:[color,'#eee'],
            series : [
                {
                    type: 'pie',
                    radius : ['85%', '95%'],
                    label: {
                        normal: {
                            position: 'center',
                            formatter: '{d}%',
                            textStyle: {
                                fontSize: 22
                            }
                        }   
                    },
                    data:[
                        {
                            value: remain, name:'使用量',
                            label: {
                                normal: {
                                    textStyle: {
                                        fontSize: 22
                                    },
                                    formatter: remain || '--'
                                }
                            }
                            
                            
                        },
                        {
                            value:total-remain<0?0:total-remain, name:'未使用',
                            
                            label: {
                                normal: {
                                    textStyle: {
                                        fontSize: 15,
                                        color:'#999'
                                    },
                                    formatter: total || '--'
                                }
                            }
                            
                        }
                    ]
                }
            ]
        })
    }

}
