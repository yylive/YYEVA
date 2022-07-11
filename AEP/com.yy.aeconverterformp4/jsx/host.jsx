

var OS_VERSION_WINDOWS = 1;
var OS_VERSION_MAC = 2;

var EFFECT_TAG_TYPE_TEXT = "txt"
var EFFECT_TAG_TYPE_IMAGE = "img" 

/**
 * 用来生成支持MP4视频插入动态元素的AE脚本
 * Author:Guoyabin YY Inc
 */
 
var AECompoItemUtils = (function() {
    function AECompoItemUtils(app) {
        this.app = app;
    }
    AECompoItemUtils.prototype.isTrackMatteType = function(layer) {

        if (layer != undefined && layer.enabled == false && layer.isTrackMatte == true) {
            return true;
        }
        return false;
    }

    AECompoItemUtils.prototype.findAlphaLayer = function (activeItem){

        if (activeItem == null || activeItem == undefined) {
            alertMessage("请选择一个合成");
            return undefined;
        }
        var layers = activeItem.layers;
        var layCount = layers.length;
        var alphaLayer = undefined;

        //定位到有蒙版的那個layer
        for (var i = 1; i <= layCount ; i++) {
            //效果->填充
            var curLayer = layers[i];
            if (curLayer.enabled == false){
                continue;
            }
            var fillPropertyGroup = curLayer.property("ADBE Effect Parade").property("ADBE Fill")
            if (fillPropertyGroup != undefined) {
                var colorPropertyGroup = fillPropertyGroup.property("ADBE Fill-0002");
                if (colorPropertyGroup != undefined) {
                    var colorValueArray = colorPropertyGroup.value ;
                    if (colorValueArray.toString() === [1,1,1,1].toString()){ //白色
                        alphaLayer = curLayer;
                        logMessage("通过ADBE Effect Parade-》ADBE Fill 找到 alphaLayer:" + alphaLayer.name)
                        break;
                    }
                }
            }
        }

        //再通过图层样式找一遍
        if (alphaLayer == undefined) {
            for (var i = 1; i <= layCount ; i++) {
                //效果->填充
                var curLayer = layers[i];
                if (curLayer.enabled == false){
                    continue;
                }
                //混合选项 混合叠加
                var layerStylePropertyGroup =  curLayer.property("ADBE Layer Styles")
                if (layerStylePropertyGroup != undefined) {
                    var colorMixProperty = layerStylePropertyGroup.property("solidFill/enabled").property("solidFill/color");
                    var colorArray = colorMixProperty.value;
                    if (colorArray.toString() == [1,1,1,1].toString()) {
                        alphaLayer = curLayer;
                        logMessage("ADBE Layer Styles-》solidFill/enabled -> solidFill/color  找到 alphaLayer:" + alphaLayer.name)
                        break;
                    }
                }
            }
        }

        return alphaLayer;
    }

    AECompoItemUtils.prototype.isValideSelCompForMask = function(activeItem) {

        if (activeItem == null || activeItem == undefined) {
            alertMessage("请选择一个合成");
            return false;
        }
        var alphaLayer = this.findAlphaLayer(activeItem);
        if (alphaLayer == null || alphaLayer == undefined) {
            alertMessage("所选图层不合理,请检查遮罩区域");
            return false;
        }
        return true;
    }

    AECompoItemUtils.prototype.findUsedInCompo = function(compoItem,activeItem,chainStr) { 
        var usedInItems = compoItem.usedIn 
        if(usedInItems.length > 0 ) {
          for (var i = 0 ; i < usedInItems.length;i++) {
             var item = usedInItems[i]   
             if (item != undefined) {
                 if (item == activeItem) {  
                     return {"item" : item , "chain" : chainStr + "->" + activeItem.name}
                 } else {
                     return this.findUsedInCompo(item,activeItem,chainStr + "->" + item.name)
                 }
             }
          }
      } 
      return undefined
}
    

    AECompoItemUtils.prototype.maskCompoWithJudgeName = function(judgeName) {
        var collection_item = this.app.project.items;
        var compoItemsCount = collection_item.length;

        for (var i = 1; i <= compoItemsCount; i++) {
            var compoItem = collection_item[i];
            //判斷是普通合成
            if ((compoItem != undefined)) { 
                if (compoItem.name.match(judgeName)) {
                    //分析引用关系   
                    var chain = this.findUsedInCompo(compoItem,this.app.project.activeItem,judgeName + "->")
                    if (chain != undefined) {
                        logMessage("找到了" + judgeName + ",引用链条为：" + chain.chain)
                        return compoItem;
                    }
                }
            }
        }
        return undefined; 
    }

    AECompoItemUtils.prototype.maskTypeWithCompo = function(compoItem) {
        if (compoItem.name.match(MaskCompo_Text)) {
            return EFFECT_TAG_TYPE_TEXT;
        } else if (compoItem.name.match(MaskCompo_Image)) {
            return EFFECT_TAG_TYPE_IMAGE;
        }
        return "";
    }
    AECompoItemUtils.prototype.scaleAlpha = function(activeItem) {

        try {
            if (activeItem == null || activeItem == undefined) {
                alertMessage("请选择一个合成");
                return false;
            }

            var alphaLayer = this.findAlphaLayer(activeItem);

            if (alphaLayer == null || alphaLayer == undefined) {
                return false;
            }

            var tramsform_group = alphaLayer.property("transform");
            var width = alphaLayer.width * 0.5;
            var heigth = alphaLayer.height * 0.5;
            var x = alphaLayer.width + width * 0.5;
            var y = heigth * 0.5;
            tramsform_group.property("scale").setValue([50, 50]);
            tramsform_group.property("Position").setValue([x, y]);

            return true;
        } catch (e) {

        }
    }
    AECompoItemUtils.prototype.findCompoUsedIn = function(compItem) {

        if (compItem == null || compItem == undefined) {
            return undefined;
        }

        var sourceLayers = [];
        var useInItems = compItem.usedIn;

        if (useInItems.length > 0) {
            for (var i = 0; i < useInItems.length; i++) {
                var item = useInItems[i];
                if (item instanceof CompItem) {
                    var subLayerCollection = item.layers;
                    for (var j = 1; j <= subLayerCollection.length; j++) {
                        var contentLayer = subLayerCollection[j];
                        if (contentLayer.name.match("mask_") != null) {
                            sourceLayers.push(contentLayer)
                        }
                    }
                }
            }
        }
        return sourceLayers;
    }
    AECompoItemUtils.prototype.hiddenLayer = function(layers) {
        for (var i = 0; i <= layers.length; i++) {
            var maskLayer = layers[i];
            if (maskLayer != undefined) {
                maskLayer.enabled = false;
            }
        }
    }
    AECompoItemUtils.prototype.showLayers = function(layers) {
        for (var i = 0; i <= layers.length; i++) {
            var maskLayer = layers[i];
            if (maskLayer != undefined) {
                maskLayer.enabled = true;
            }
        }
    }


    return AECompoItemUtils;
}());


var DynamicMp4Conveter = (function() {

    function DynamicMp4Conveter(app) {
        this.app = app;
        this.compoItemUtils = new AECompoItemUtils(this.app);
        this.proj = undefined;
        this.activeItem = this.app.project.activeItem;
        this.loadProj();
    }

    DynamicMp4Conveter.prototype.scaleOutputCompoItem = function(){
         var activeItem = this.activeItem;
         var layers = activeItem.layers;


    }


    DynamicMp4Conveter.prototype.beginConveter = function(tempPath) {

        //判断有没有convertMP4模板

        //判断当前选择合成合法性
        if (!this.compoItemUtils.isValideSelCompForMask(this.activeItem)) {
            logMessage("查找遮罩区域失败")
            return undefined;
        }
        //获取文字/图像遮罩合成
        logMessage("开始处理,所选合成为：" + this.activeItem.name)

        var txtCompoItem = this.compoItemUtils.maskCompoWithJudgeName(MaskCompo_Text);
        var imgCompoItem = this.compoItemUtils.maskCompoWithJudgeName(MaskCompo_Image);

        //分析文字/图像遮罩合成
        var txtMaskInfo = txtCompoItem != undefined ? this.analysisMaskCompo(txtCompoItem) : undefined;
        var imgMaskInfo = imgCompoItem != undefined ? this.analysisMaskCompo(imgCompoItem) : undefined;
        var maskInfoList = [];

        if (txtMaskInfo != undefined) {
            maskInfoList = maskInfoList.concat(txtMaskInfo)
        }
        if (imgMaskInfo != undefined) {
            maskInfoList = maskInfoList.concat(imgMaskInfo)
        }

        if (txtMaskInfo == undefined && imgMaskInfo == undefined) {
            logMessage("analysisMaskCompo fail")
            alertMessage("请确保项目中包含 mask_text 或 mask_image 的合成，并有当前所选合成的引用")
            return undefined;
        }

        logMessage("analysisMaskCompo complete")

        //获取所有源信息描述
        var sourceInfos = this.loadMaskSourceInfo(maskInfoList);

        if (sourceInfos.length == 0) {
            logMessage("loadMaskSourceInfo fail:sourceInfos.count == 0");
        }

        logMessage("loadMaskSourceInfo complete")

        //复制合成
        var compoItem = this.activeItem.duplicate();

        //缩小alpha区域
        if (this.compoItemUtils.scaleAlpha(compoItem) == false) {
            alertMessage("缩放alpha区域失败")
            logMessage("scaleAlpha fail")
            return undefined;
        }

        logMessage("scaleAlpha complete")

        //计算最大容纳区域
        //调整输出合成的大小
        //合并图层
        var outputInfo = this.mergeLayer(maskInfoList, sourceInfos,compoItem);

        logMessage("mergeLayer complete")

     

        var scale = outputInfo.scale;
        var scaleX = (scale.scaleX); //取整
        var scaleY = (scale.scaleY);

        var orginW = compoItem.width;
        var orginH = compoItem.height;

        var outputWidth = compoItem.width * 0.5 * (1 + scaleX);
        var outputHeight = compoItem.height * 0.5 * (1 + scaleY);

        //处理第一帧的宽高
        var src = [];
        for (var k in sourceInfos) {
            var sourceRes = sourceInfos[k] 
            var tempSourceId = sourceRes["effectId"]
            var  tempFrame = outputInfo.mergeLayerInfos.frame
            var tempDatas = tempFrame[0]["data"]
            for (var j = 0 ; j < tempDatas.length  ; j++) {
                var tempData =  tempDatas[j]
                if(tempData["effectId"] == tempSourceId) {
                    sourceRes["effectWidth"] =  tempData["renderFrame"][2] 
                    sourceRes["effectHeight"] =  tempData["renderFrame"][3]
                    break
                }
            }
           
            src.push(sourceRes);
        }


        //找到最接近16的倍数的整数
        var outputWidthCeil = 16 * Math.ceil(outputWidth / 16);
        var outputHeightCeil = 16 * Math.ceil(outputHeight / 16);

        logMessage("orginW :" + orginW + ",orginH:" + orginH + ",scaleX:" + scaleX + ",scaleY" + scaleY + ",outputWidth:"+outputWidth + ",outputHeight:"+outputHeight, + ",outputWidthCeil:"+ outputWidthCeil + ",outputHeightCeil:" + outputHeightCeil);

        compoItem.width = outputWidthCeil;
        compoItem.height = outputHeightCeil;

        var mergeLayerInfos = outputInfo.mergeLayerInfos;
        var width = this.proj.width;
        var height = this.proj.height;
        var outputJson = {
            "descript": {
                "width": outputWidthCeil,
                "height": outputHeightCeil,
                "isEffect": 1,
                "version": AE_Extension_Version,
                "rgbFrame": [0, 0, width * 0.5, height],
                "alphaFrame": [width * 0.5, 0, width * 0.25, height * 0.5],
                "fps":this.proj.frameRate
            },
            "effect": src,
            "datas": mergeLayerInfos.frame,
        };

        //隐藏mask_layer在父layer上
        var hiddenLayers = [];
        var txtCompoItemUserInLayer = this.compoItemUtils.findCompoUsedIn(txtCompoItem);
        var imgCompoItemUserInLayer = this.compoItemUtils.findCompoUsedIn(imgCompoItem);
        if (txtCompoItemUserInLayer != undefined) {
            hiddenLayers = hiddenLayers.concat(txtCompoItemUserInLayer)
        }

        if (imgCompoItemUserInLayer != undefined) {
            hiddenLayers = hiddenLayers.concat(imgCompoItemUserInLayer)
        }

        this.compoItemUtils.hiddenLayer(hiddenLayers)
        var aviFile = renderQueue(compoItem, tempPath)
        compoItem.remove();
        this.compoItemUtils.showLayers(hiddenLayers)
        var result = {
            "file": aviFile,
            "evaJson": JSON.stringify(outputJson)
        };
        //渲染
        var json = JSON.stringify(result)
        return json;
    };

    DynamicMp4Conveter.prototype.getOSVersion = function() {
        if (system.osName.indexOf("Windows") >= 0) {
            return OS_VERSION_WINDOWS;
        }
        return OS_VERSION_MAC;
    }

    DynamicMp4Conveter.prototype.loadProj = function() {
        this.proj = {
            name: this.app.project.activeItem.name,
            width: this.app.project.activeItem.width,
            height: this.app.project.activeItem.height,
            duration: this.app.project.activeItem.duration,
            frameRate: this.app.project.activeItem.frameRate,
            frameCount: this.app.project.activeItem.frameRate * this.app.project.activeItem.duration,
        };
    };

    DynamicMp4Conveter.prototype.mergeLayer = function(findMask, souceSrc,copyCompoItem) {
        var margin = 2;
        var frameIndex = 0;
        var mergeLayerInfos = {
            "frame": []
        };
        var allCopyLayer = [];
        var activeItem = this.activeItem;
        var duration = this.proj.duration;
        var frameRate = this.proj.frameRate;
        var step = 1.0 / frameRate;

        var maxWidth = activeItem.width * 0.5 - margin;
        var maxHeight = activeItem.height * 0.5 - margin;

        var beginY = activeItem.height * 0.5 + margin;
        var beginX = activeItem.width * 0.5 + margin;

        for (var cTime = 0.0; cTime < duration; cTime += step) {

            var startX = activeItem.width * 0.5 + margin;
            var startY = activeItem.height * 0.5 + margin;

            var leftWidth = activeItem.width * 0.5 - margin;
            var leftHeight = activeItem.height * 0.5 - margin;

            var curMaxHeight = 0;
            var curWidth = 0;
            var curFrameIndexMask = [];

            var preLayer = undefined;
            var preCopyLayer = undefined;
            var isNewLine = true;
            for (var i = 0; i < findMask.length; i++) {
                var layerInfo = findMask[i];
                var frames = layerInfo["frame"];
                var startTime = layerInfo["startTime"];
                var layer = layerInfo["layer"];
                var copyLayer = layerInfo["copyLayer"];
                var srcId;
                if (souceSrc[layer.name] != undefined) {
                    srcId = souceSrc[layer.name]["effectId"];
                }
                var mask = {
                    "renderFrame": frames[frameIndex]["frame"],
                    "effectId": srcId
                };

                if (frameIndex == 0) {
                    //copy layer
                    copyLayer = layer.duplicate();
                    allCopyLayer.push(copyLayer)
                    layerInfo["copyLayer"] = copyLayer;
                    copyLayer.startTime = startTime;
                }

                if (this.compoItemUtils.isTrackMatteType(layer) && preLayer != undefined && preLayer.hasTrackMatte == true) {
                    //计算TrackMatte的位置
                    var positionContents = preLayer.property("ADBE Transform Group").property("ADBE Position");
                    var x = positionContents.valueAtTime(cTime, false)[0];
                    var y = positionContents.valueAtTime(cTime, false)[1];

                    var preCopyposition = preCopyLayer.property("ADBE Transform Group").property("ADBE Position");
                    var newX = preCopyposition.valueAtTime(cTime, false)[0];
                    var newY = preCopyposition.valueAtTime(cTime, false)[1];
                    var offSetX = newX - x;
                    var offSetY = newY - y;
                    var layerpositionContents = layer.property("ADBE Transform Group").property("ADBE Position");
                    var layerX = layerpositionContents.valueAtTime(cTime, false)[0];
                    var layerY = layerpositionContents.valueAtTime(cTime, false)[1];
                    var newLayerX = layerX + offSetX;
                    var newLayerY = layerY + offSetY;
                    var copyPosition = copyLayer.property("ADBE Transform Group").property("ADBE Position");
                    copyPosition.setValueAtTime( cTime,[newLayerX, newLayerY, 0]);
                    continue;
                }


                var position = copyLayer.property("ADBE Transform Group").property("ADBE Position");

                var frameInfo = frames[frameIndex];
                var layerWidth = frameInfo["width"];
                var layerHeight = frameInfo["height"];
                var trueWidth = frameInfo["frame"][2];
                var trueHeight = frameInfo["frame"][3];

                //計算下一個的位置

                if (leftWidth < trueWidth && !isNewLine) {
                    startY = startY + curMaxHeight + margin;
                    startX = this.activeItem.width * 0.5 + margin;
                    curWidth = 0;
                    if (maxWidth < trueWidth) {
                        maxWidth = trueWidth;
                    }
                }
                isNewLine = false;

                if (frameIndex == frameRate) {
                    logMessage("maxHeight," + maxHeight + ",startY:"+startY+",trueHeight:" + trueHeight);
                    if (maxHeight < curMaxHeight) {
                        maxHeight = curMaxHeight;
                    }
                }


                //startY = app.project.activeItem.height * 0.5 + margin + layerHeight;

                var mFrame = this.calculatorMFrame(layer, layerWidth, layerHeight, startX, startY, cTime, (layer.matchName == "ADBE AV Layer"));
                position.setValueAtTime(cTime, [mFrame["newOrginX"], mFrame["newOrginY"], 0]);
                mask["outputFrame"] = mFrame["frame"];
                curFrameIndexMask.push(mask);

                leftWidth = this.activeItem.width * 0.5 - curWidth - trueWidth - margin;
                curWidth = curWidth + trueWidth + margin;
                if (trueWidth > 0 && trueHeight > 0) {
                    curMaxHeight = Math.max(curMaxHeight, trueHeight);
                    startX = startX + margin + trueWidth;
                }

                preLayer = layer;
                preCopyLayer = copyLayer;
            }

            mergeLayerInfos["frame"].push({
                "frameIndex": frameIndex,
                "data": curFrameIndexMask,
            });
            frameIndex++;
        }



        for (var k = 0; k < allCopyLayer.length; k++) {
            var currentLayer = allCopyLayer[k];
            if (currentLayer != null && currentLayer != undefined) {
                currentLayer.copyToComp(copyCompoItem);
                currentLayer.remove();
            }
        }

        var scaleX = 1.0;
        var scaleY = 1.0;
        var orginLeftWidth = (this.activeItem.width * 0.5 - margin);
        var orginLeftHeight = (this.activeItem.height * 0.5 - margin);


        if (maxWidth > orginLeftWidth) {
           scaleX = Math.max((maxWidth - beginX) / orginLeftWidth , 1) ;
        }
        if (maxHeight > orginLeftHeight) {
            scaleY = Math.max((maxHeight - beginY) /  orginLeftHeight , 1) ;
        }

        var scale = {scaleX:scaleX,scaleY:scaleY};

        return {
            mergeLayerInfos: mergeLayerInfos,
            scale:scale
        };
    }
    DynamicMp4Conveter.prototype.loadMaskSourceInfo = function(maskList) {
        var srcInfos = {};
        var srcId = 1;
        for (var idx = 0; idx < maskList.length; idx++) {
            var src = {};
            var textLayerInfo = maskList[idx]; // {layerInfo : frame layer matrix }
            var layer = textLayerInfo["layer"];
            if (this.compoItemUtils.isTrackMatteType(layer)) {
                continue;
            }
            var type = textLayerInfo["type"];
            var layerName = textLayerInfo["name"]

            
            var frames = textLayerInfo["frame"];
            var frameInfo = frames[0];
            var layerWidth = frameInfo["width"];
            var layerHeight = frameInfo["height"];
            src["effectWidth"] = layerWidth;
            src["effectHeight"] = layerHeight;
            src["effectId"] = srcId;
            
            src["effectType"] = type;
            var orginLayerName = layerName


            if (type == EFFECT_TAG_TYPE_TEXT) {
                //key-fontColor-fontSize
                 var arr = layerName.split('-')
                 var fontColor = undefined
                 var fontSize = undefined
 
                 if (arr.length >= 1) {
                    layerName = arr[0]
                 } 

                 if (arr.length >= 2 ) {
                    fontColor = arr[1] 
                    var fontColorRegExp = /^#[0-9A-F]{6}$/i; 
                    var valid = fontColorRegExp.test(fontColor)?1:0; //判断字体颜色合法性
                    if (valid != 1) {
                        fontColorRegExp = /^[0-9A-F]{6}$/i; 
                        valid = fontColorRegExp.test(fontColor)?1:0; //判断字体颜色合法性
                        if (valid == 1) {
                            fontColor = ("#") + fontColor;
                        } else {
                            fontColor = undefined
                        }
                    }  
                 } 

                 if (arr.length >= 3) {
                     fontSize = arr[2]
                     var fontSizeRegExp = /^[0-9]+$/i; 
                     var sc = fontSizeRegExp.test(fontSize)?1:0; //判断字体大小合法性
                     if (valid != 1) {
                        fontSize = undefined 
                     }
                 } 

                src["effectTag"] = layerName; 

                if (fontColor != undefined) {
                    src["fontColor"] = fontColor; 
                }

                if (fontSize != undefined) {
                    src["fontSize"] = parseInt(fontSize); 
                }  
            } else if (EFFECT_TAG_TYPE_IMAGE){

                 //key-fontColor-fontSize
                 var arr = layerName.split('-')
                 var imageScaleMode = ["scaleFill","aspectFit","aspectFill"]

                 if (arr.length >= 1) {
                    layerName = arr[0]
                 }      

                src["scaleMode"] = imageScaleMode[0]
                 if (arr.length >= 2 ) {
                    var tempScaleMode = arr[1] 
                    if (tempScaleMode == imageScaleMode[1]) {
                        src["scaleMode"] = imageScaleMode[1];        
                    } else if (tempScaleMode == imageScaleMode[2]) {
                        src["scaleMode"] = imageScaleMode[2];        
                    } 
                 }         

                src["effectTag"] = layerName;
            }


            srcId++;
            srcInfos[orginLayerName] = src;
        }
        return srcInfos;
    }
    DynamicMp4Conveter.prototype.analysisMaskCompo = function(compoItem) {
        var allMaskLayer = [];
        var maskLayerCollection = compoItem.layers;
        var maskLayerLength = maskLayerCollection.length;
        for (var i = 1; i <= maskLayerLength; i++) {
            var layer = maskLayerCollection[maskLayerLength - i + 1]; //逆序读取 保证客户端的次序
            logMessage("开始分析mask区域的layer:" + layer.name + ",matchName:" + layer.matchName);
            var layerInfo = this.loadLayer(layer);
            layerInfo["type"] = this.compoItemUtils.maskTypeWithCompo(compoItem);
            layerInfo["startTime"] = compoItem.displayStartTime + layer.startTime; //把开始时间也copy过去
            allMaskLayer.push(layerInfo)
            logMessage("分析完成："  + layer.name);
        }
        return allMaskLayer;
    }
    DynamicMp4Conveter.prototype.requestMatrixAtTime = function(layer,contentTransform, cTime) {

        //根据contentTransform，计算内容区域的属性值
        var contentax = 0;
        var contentay = 0;
        var contentsx = 1;
        var contentsy = 1;
        var contenttx = 0;
        var contentty = 0;
        var contentRotation = 0;

        var transform = layer.transform;
        var rotation = transform["Rotation"].valueAtTime(cTime, false) ;
        var ax = transform["Anchor Point"].valueAtTime(cTime, false)[0] ;
        var ay = transform["Anchor Point"].valueAtTime(cTime, false)[1]  ;
        var sx = transform["Scale"].valueAtTime(cTime, false)[0] / 100.0  ;
        var sy = transform["Scale"].valueAtTime(cTime, false)[1] / 100.0  ;
        var tx = transform["Position"].valueAtTime(cTime, false)[0]  ;
        var ty = transform["Position"].valueAtTime(cTime, false)[1] ;

        var matrix = new Matrix();
        matrix.reset();

        //计算内容区域的transform
        if (contentTransform != undefined) {
            contentRotation = contentTransform["Rotation"].valueAtTime(cTime, false);
            contentax = contentTransform["Anchor Point"].valueAtTime(cTime, false)[0];
            contentay = contentTransform["Anchor Point"].valueAtTime(cTime, false)[1];
            contentsx = contentTransform["Scale"].valueAtTime(cTime, false)[0] / 100.0;
            contentsy = contentTransform["Scale"].valueAtTime(cTime, false)[1] / 100.0;
            contenttx = contentTransform["Position"].valueAtTime(cTime, false)[0];
            contentty = contentTransform["Position"].valueAtTime(cTime, false)[1];
            matrix.translate(-contentax, -contentay).scale(contentsx, contentsy).rotate(-contentRotation * Math.PI / 180);
            matrix.translate(contenttx, contentty);
        }

        matrix.translate(-ax, -ay).scale(sx, sy).rotate(-rotation * Math.PI / 180);
        matrix.translate(tx, ty);
        var currentParent = layer.parent;
        while (currentParent != null && currentParent != undefined) {
            matrix.translate(-currentParent.transform["Anchor Point"].valueAtTime(cTime, false)[0], -currentParent.transform["Anchor Point"].valueAtTime(cTime, false)[1])
                .scale(currentParent.transform["Scale"].valueAtTime(cTime, false)[0] / 100.0, currentParent.transform["Scale"].valueAtTime(cTime, false)[1] / 100.0)
                .rotate(-(currentParent.transform["Rotation"].valueAtTime(cTime, false)) * Math.PI / 180);
            matrix.translate(currentParent.transform["Position"].valueAtTime(cTime, false)[0], currentParent.transform["Position"].valueAtTime(cTime, false)[1]);
            currentParent = currentParent.parent;
        }

        return matrix;
    }
    DynamicMp4Conveter.prototype.requestMatrix = function(layer) {
        var matrixs = [];
        var step = 1.0 / this.proj.frameRate;

        var frameIndex = 0;

        var contentTransform = undefined;

        if (layer.matchName == "ADBE Vector Layer") { //如果是矢量图形 要加上内容区域 的 内容变换
            var contents = layer.property("Contents");
            var group = contents.property("ADBE Vector Group");
            contentTransform = group.property("ADBE Vector Transform Group")
        }


        for (var cTime = 0.0; cTime < this.proj.duration; cTime += step) {
            var matrix = this.requestMatrixAtTime(layer, contentTransform,cTime);
            matrixs.push({
                frameIndex: frameIndex,
                matrix: matrix
            });
            frameIndex++;
        }
        return matrixs;
    }
    /**
     * 获取图层在指定时间戳的Frame
     * @param frameConfig
     * @param layer
     * @param matrix
     * @returns {*[]}
     */
    DynamicMp4Conveter.prototype.requestAVLayerContentRectFrame = function(layer, matrix) {
        var width = layer.width;
        var height = layer.height;
        var positionContents = layer.property('Position');
        var leftTop, leftBottom, rightTop, rightBottom;
        var newLeftTop, newLeftBottom, newRightTop, newRightBottom;
        var step = 1.0 / this.proj.frameRate;

        var frames = [];

        var frameIndex = 0;
        for (var cTime = 0.0; cTime < this.proj.duration; cTime += step) {
            var position = positionContents.valueAtTime(cTime, false);

            var x = 0;
            var y = 0;
            leftTop = [x, y, 1];
            leftBottom = [x, y + height, 1];
            rightTop = [x + width, y, 1];
            rightBottom = [x + width, y + height, 1];

            var m = matrix[frameIndex]["matrix"];
            newLeftTop = m.applyToPoint(leftTop[0], leftTop[1], 1);
            newLeftBottom = m.applyToPoint(leftBottom[0], leftBottom[1], 1);
            newRightTop = m.applyToPoint(rightTop[0], rightTop[1], 1);
            newRightBottom = m.applyToPoint(rightBottom[0], rightBottom[1], 1);

            var vertexInfo = findMinMaxPoint(newLeftTop, newLeftBottom, newRightTop, newRightBottom);
            var min = vertexInfo["min"];
            var max = vertexInfo["max"];

            var transformW = max[0] - min[0];
            var transformH = max[1] - min[1];
            var frame = [min[0], min[1], transformW, transformH];

            frames.push({
                frameIndex: frameIndex,
                frame: frame,
                matrix: m,
                width: width,
                height: height,
            });
            frameIndex++;
        }

        return frames;
    }
    /**
     * 获取图层在指定时间戳的Frame
     * @param frameConfig
     * @param layer
     * @param matrix
     * @returns {*[]}
     */
    DynamicMp4Conveter.prototype.requestContentRectFrame = function(layer, matrix) {
        var sizeContents = layer.property('Size');
        var positionContents = layer.property('Position');
        var leftTop, leftBottom, rightTop, rightBottom;
        var newLeftTop, newLeftBottom, newRightTop, newRightBottom;
        var step = 1.0 / this.proj.frameRate;

        var frames = [];
        var frameIndex = 0;
        logMessage("requestContentRectFrame name: " + layer.name + ",proj.duration: " + this.proj.duration + ",step: " + step)
        for (var cTime = 0.0; cTime < this.proj.duration; cTime += step) {
            var position = positionContents.valueAtTime(cTime, false);
            var size = sizeContents.valueAtTime(cTime, false);
            var width = size[0];
            var height = size[1];
            var x = position[0] - width / 2;
            var y = position[1] - height / 2;

            leftTop = [x, y, 1];
            leftBottom = [x, y + height, 1];
            rightTop = [x + width, y, 1];
            rightBottom = [x + width, y + height, 1];

            var m = matrix[frameIndex]["matrix"];
            newLeftTop = m.applyToPoint(leftTop[0], leftTop[1], 1);
            newLeftBottom = m.applyToPoint(leftBottom[0], leftBottom[1], 1);
            newRightTop = m.applyToPoint(rightTop[0], rightTop[1], 1);
            newRightBottom = m.applyToPoint(rightBottom[0], rightBottom[1], 1);

            var vertexInfo = findMinMaxPoint(newLeftTop, newLeftBottom, newRightTop, newRightBottom);
            var min = vertexInfo["min"];
            var max = vertexInfo["max"];

            var transformW = max[0] - min[0];
            var transformH = max[1] - min[1];
            ///因为ShaperLayer默认的锚点是在中心
            var frame = [min[0], min[1], transformW, transformH];

            frames.push({
                frameIndex: frameIndex,
                frame: frame,
                matrix: m,
                width: width,
                height: height,
            });
            frameIndex++;
        }

        return frames;
    }
    DynamicMp4Conveter.prototype.requestFrame = function(layer, matrix) {
        var shapes = [];

        if (layer == null || layer == undefined) {
            return shapes;
        }
        logMessage("layer.matchName:" + layer.matchName)
        if (layer.matchName == "ADBE Vector Shape - Rect" || layer.matchName == "ADBE Vector Shape - Ellipse") {
            var results = this.requestContentRectFrame(layer, matrix);
            for (var j = 0; j < results.length; j++) {
                shapes.push(results[j]);
            }

        } else if (layer.matchName == "ADBE AV Layer") {
            var results = this.requestAVLayerContentRectFrame(layer, matrix);
            for (var j = 0; j < results.length; j++) {
                shapes.push(results[j]);
            }
        } else {
            var contents = layer.property("Contents");
            if (contents != null && contents != undefined) {

                var numberProperties = contents.numProperties;
                for (var i = 1; i <= numberProperties; i++) {
                    var content = contents.property(i);
                    var results = this.requestFrame(content, matrix);
                    for (var j = 0; j < results.length; j++) {
                        shapes.push(results[j]);
                    }

                }
            }
        }

        return shapes;
    }
    DynamicMp4Conveter.prototype.loadLayer = function(layer, parent) {
        //Shape Layer
        var layerInfo = undefined;

        if (layer.matchName == "ADBE Vector Layer" || layer.matchName == "ADBE AV Layer") {
            layerInfo = {}
            //mFrame
            var matrix = this.requestMatrix(layer); //显示的位置
            var frames = this.requestFrame(layer, matrix);
            layerInfo["frame"] = frames;
            layerInfo["layer"] = layer;
            layerInfo["name"] = layer.name;
        }
        return layerInfo;
    }

    DynamicMp4Conveter.prototype.calculatorMFrame = function(layer, layerWidth, layerHeight, originX, originY, cTime, isOriginAnchor) {

        var contentTransform = undefined;

        if (layer.matchName == "ADBE Vector Layer") {
            var contents = layer.property("Contents");
            var group = contents.property("ADBE Vector Group");
            contentTransform = group.property("ADBE Vector Transform Group")
        }

        var contentax = 0;
        var contentay = 0;
        var contentsx = 1;
        var contentsy = 1;
        var contenttx = 0;
        var contentty = 0;
        var contentRotation = 0;


        if (contentTransform != undefined) {
            contentRotation = contentTransform["Rotation"].valueAtTime(cTime, false);
            contentax = contentTransform["Anchor Point"].valueAtTime(cTime, false)[0];
            contentay = contentTransform["Anchor Point"].valueAtTime(cTime, false)[1];
            contentsx = contentTransform["Scale"].valueAtTime(cTime, false)[0] / 100.0;
            contentsy = contentTransform["Scale"].valueAtTime(cTime, false)[1] / 100.0;
            contenttx = contentTransform["Position"].valueAtTime(cTime, false)[0];
            contentty = contentTransform["Position"].valueAtTime(cTime, false)[1];
        }



        var x = isOriginAnchor ? 0 : -layerWidth / 2
        var y = isOriginAnchor ? 0 : -layerHeight / 2
        var leftTop = [x, y, 1];
        var leftBottom = [x, y + layerHeight, 1];
        var rightTop = [x + layerWidth, y, 1];
        var rightBottom = [x + layerWidth, y + layerHeight, 1];

        var transform = layer.transform;

        var rotation = transform["Rotation"].valueAtTime(cTime, false) ;
        var sx = transform["Scale"].valueAtTime(cTime, false)[0] / 100.0 ;
        var sy = transform["Scale"].valueAtTime(cTime, false)[1] / 100.0  ;

        var ax = transform["Anchor Point"].valueAtTime(cTime, false)[0]  ;
        var ay = transform["Anchor Point"].valueAtTime(cTime, false)[1]  ;


        var matrix = new Matrix();
        matrix.reset();

        matrix.translate(-contentax, -contentay).scale(contentsx, contentsy).rotate(-contentRotation * Math.PI / 180);
        matrix.translate(contenttx, contentty);

        matrix.translate(-ax, -ay).scale(sx, sy).rotate(-rotation * Math.PI / 180);
        matrix.translate(originX, originY);
        var newLeftTop = matrix.applyToPoint(leftTop[0], leftTop[1], 1);
        var newLeftBottom = matrix.applyToPoint(leftBottom[0], leftBottom[1], 1);
        var newRightTop = matrix.applyToPoint(rightTop[0], rightTop[1], 1);
        var newRightBottom = matrix.applyToPoint(rightBottom[0], rightBottom[1], 1);

        var vertexInfo = findMinMaxPoint(newLeftTop, newLeftBottom, newRightTop, newRightBottom);
        var min = vertexInfo["min"];
        var max = vertexInfo["max"];
        var offsetX = min[0] - originX;
        var offsetY = min[1] - originY;

        var x = originX - offsetX;
        var y = originY - offsetY;

        var width = max[0] - min[0];
        var height = max[1] - min[1];

        return {
            newOrginX: x,
            newOrginY: y,
            frame: [originX, originY, width, height]
        }
    }
    return DynamicMp4Conveter;
}());


//流程
//1.判断图层合法性（checkSelectInvalide）
//2.获取所有的Mask合成 (以合成命名为mask_为开头的图层)
function startConverter(tempPath) {

    var compoItem = app.project.activeItem

    if (checkValidCompItem(compoItem) == false) {
        return undefined;
    }

    if (checkHasConverMP4Template(compoItem)==false) {
        alertMessage("AE模板不正确");
        logMessage("AE模板不正确");
        return undefined;
    }

    var mp4Conveter = new DynamicMp4Conveter(app);
    var json = mp4Conveter.beginConveter(tempPath)
    return json;
}


function startConverter_Normal(aviPath) {
 
    var compoItem = app.project.activeItem 
    var valid = checkValidCompItem(compoItem)
 
    if (valid == false) { 
        return undefined;
    }    

    valid =  checkHasConverMP4Template(compoItem);
     
    if (valid == false) { 
        return undefined;
    }  
  
    var file = renderQueue(compoItem,aviPath)

    return file
}



function checkValidCompItem(compoItem) {
  
    if (compoItem == null || compoItem == undefined) {
        alertMessage("请选择一个合成");
        logMessage("所选图层为空");
        return false;
    } 

    var preTips  =  "所选合成 :" +  compoItem.name + " "

    if ((compoItem instanceof CompItem) == false) {
        alertMessage(preTips + "不是CompItem");
        logMessage(preTips + "不是CompItem");
        return false;
    } 

    var width = compoItem.width
    var height = compoItem.height
  
    if(width % 2 != 0 ) {
        alert(preTips + "宽高不合法," +  "width:" + width + ",heigth:" + height + ",请调整为2的倍数");
        logMessage(preTips + "宽高不合法," +  "width:" + width + ",heigth:" + height + ",请调整为2的倍数");
        return false;
    }  

    if(height % 2 != 0) {
        alert(preTips + "宽高不合法," +  "width:" + width + ",heigth:" + height + ",请调整为2的倍数");
        logMessage(preTips + "宽高不合法," +  "width:" + width + ",heigth:" + height + ",请调整为2的倍数");
        return false;
    }  

    return true;
}