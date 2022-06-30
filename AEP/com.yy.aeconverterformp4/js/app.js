 
/**
 * index.html对应的JS文件
 * Author:Guoyabin YY Inc
 */ 

var csInterface = new CSInterface();
var nodePath = require("path");
var fs = require('fs')
var curExtensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
var ffmpegUrl_windows = nodePath.join(curExtensionPath, 'localbin//windows/ffmpeg.exe');
var ffmpegUrl_mac = nodePath.join(curExtensionPath, 'localbin/mac/ffmpeg');

var AdmZip = require("adm-zip");
var CURRENT_FILE_PATH;
var CURRENT_SOURCE_NAME;
var TEMP_SOURCE_PATH;
var LOG_PATH;
var outputPath;
var outputLogPath;
var outputTempPath;
var OS_VERSION_WINDOWS = 1;
var OS_VERSION_MAC = 2;
var YYEVA_WRITE_STYLE_METADATA = 1; 
var YYEVA_CUR_WRITE_STYLE = YYEVA_WRITE_STYLE_METADATA;
var CEP_Plugin_Version;
var customer_crf = 23; 


var MP4EnCodeLevel = {
    low: 0,
    mid: 1,
    high: 2,
    customer:3,
};
var MP4EnCodeType = {
    avc: 0,
    hevc: 1
};

var MP4ConverMode = {
    normal:0,
    dynamic:1
}

var encodeLevel = MP4EnCodeLevel.mid;

var LogFile = 'Log.txt'
var currentChanegFile = "logs ";

var progress = 0;



function aeLogMessageEvent(myEvent){ 
    var logStr = myEvent.data;
    if (logStr == undefined) {
        return
    }
    logJSXFile(logStr)
}

function getPluginVersion() {
    const fs = require('fs');
    const path = csInterface.getSystemPath(SystemPath.EXTENSION);
    const data = fs.readFileSync(`${path}/CSXS/manifest.xml`);

    var version = "";


    if (window.DOMParser) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(data.toString(), 'text/xml');
        const children = xmlDoc.children;

        for (let i = 0; i <= children.length; i++) {
            if (children[i] && children[i].getAttribute('ExtensionBundleVersion')) {
                version = children[i].getAttribute('ExtensionBundleVersion');
            }
        }
    }

    if (version!=undefined){
        CEP_Plugin_Version = version;
    } else {
        CEP_Plugin_Version = "Unknown";
    }



    return version
}


window.onload = function () {
    csInterface.addEventListener("LogMessageEvent",aeLogMessageEvent)
    //需要补充 active project change事件
    var version =  (getPluginVersion())

    document.getElementById("ae_ver_text").innerText = "插件版本:" + version;

}

window.onunload = function () {
    //删除临时文件
    // 删除临时文件目录
    csInterface.removeEventListener("LogMessageEvent")
}

function updateInfo(callback) {
    csInterface.evalScript("getActiveInfo()", function (result) {

        if (result == "") {
            alertMessage("请检查所选项目合法性");
            callback(false)
            return;
        }

        storageCounter = 0;
        var infoArr = result.split('_and_');
        CURRENT_FILE_PATH = infoArr[0];
        var pathArr = infoArr[0].split(nodePath.sep);
        pathArr.pop();
        CURRENT_SOURCE_PATH = pathArr.join(nodePath.sep);
        CURRENT_SOURCE_NAME = infoArr[1];
        callback(true);
    });
}

function selectLogPath() {

    updateInfo(function (success) {

        if (!success) {
            return;
        }

        TEMP_SOURCE_PATH = nodePath.join(CURRENT_SOURCE_PATH, '_temp_');
        LOG_PATH = nodePath.join(CURRENT_SOURCE_PATH, '插件日志');


        TEMP_SOURCE_PATH = changePathToPlatform(TEMP_SOURCE_PATH)
        LOG_PATH = changePathToPlatform(LOG_PATH)


        var os=require('os');
        var homedir=os.homedir();
        var desktopDir = nodePath.join(homedir, 'desktop');
        var result = window.cep.fs.showSaveDialogEx("一键导出日志", desktopDir, ["zip"], "插件运行日志" + '.zip', '');
        if (result.data) {
            outputLogPath = changePathToPlatform(result.data)
            document.getElementById("pathLogText").innerHTML = result.data
        }
    });


}

function startOutputLog() {
    //找到 插件日志 + 资源
    if (outputLogPath == undefined) {
        alertMessage("请选择插件日志导出路径")
        return
    }
    if (LOG_PATH == undefined || TEMP_SOURCE_PATH == undefined) {
        alertMessage("请打开一个需要导出日志的AE资源")
        return
    }

    showModalLogTip(true)

    // var zip = require('file-zip');
    // /*compressed folder*/
    // zip.zipFolder([LOG_PATH,TEMP_SOURCE_PATH],outputLogPath,function(err){
    //
    //     showModalLogTip(false)
    //
    //     if(err){
    //         alertMessage("导出失败" + err)
    //     }else{
    //         alertMessage("导出成功")
    //     }
    // })
    var zip = new AdmZip();

    var writeCount = 0;

    zip.addLocalFolderAsync(LOG_PATH,function (success,error) {
        writeCount ++;
        if (writeCount == 2) {
            writeZipPromise(zip,outputLogPath)
        }
    },"ae_log")

    zip.addLocalFolderAsync(TEMP_SOURCE_PATH,function (success,error) {
        writeCount ++;
        if (writeCount == 2) {
            writeZipPromise(zip,outputLogPath)
        }
    },"temp_log")
}

function writeZipPromise(zip,path) {
    zip.writeZip(/*target file name*/ path,function () {
        alertMessage("导出成功")
        //打开目录
        showModalLogTip(false)
    });

}


function selectPath_normal() {

    updateInfo(function (success) {

        var result = window.cep.fs.showSaveDialogEx("选择保存目录", CURRENT_SOURCE_PATH, ["mp4"], CURRENT_SOURCE_NAME + '.mp4', '');
        TEMP_SOURCE_PATH = nodePath.join(CURRENT_SOURCE_PATH, '_temp_');
        outputTempPath = nodePath.join(TEMP_SOURCE_PATH, 'temp_change.mp4');

        TEMP_SOURCE_PATH = changePathToPlatform(TEMP_SOURCE_PATH)
        outputTempPath = changePathToPlatform(outputTempPath)
        if (result.data) {
            outputPath = changePathToPlatform(result.data);
            document.getElementById("pathtext_normal").innerHTML = outputPath
        }
    });
}

function cleanProject() {
    //清空当前目录选择
    outputTempPath = undefined;
    TEMP_SOURCE_PATH = undefined;
    outputPath = undefined;
    document.getElementById("pathtext_dynamic").innerHTML = "未设置"
    document.getElementById("pathtext_normal").innerHTML = "未设置"
    selectLevel(1);
}

function selectPath_dynamic() {

    updateInfo(function () {

        var result = window.cep.fs.showSaveDialogEx("选择保存目录", CURRENT_SOURCE_PATH, ["mp4"], CURRENT_SOURCE_NAME + '.mp4', '');
        TEMP_SOURCE_PATH = nodePath.join(CURRENT_SOURCE_PATH, '_temp_');
        var OSVersion = csInterface.getOSInformation();
        outputTempPath = nodePath.join(TEMP_SOURCE_PATH, 'temp_change.mp4');

        TEMP_SOURCE_PATH = changePathToPlatform(TEMP_SOURCE_PATH)
        outputTempPath = changePathToPlatform(outputTempPath)
        if (result.data) {
            outputPath = changePathToPlatform(result.data);
            document.getElementById("pathtext_dynamic").innerHTML = outputPath
        }
    });
}

function needShowAllCustomerInput(needShow) {

    var customerEs = document.getElementsByClassName('customerCRFInput')

    for (var i = 0;i<customerEs.length;i++) {
        var customerLevelInput = customerEs[i]
        customerLevelInput.style.visibility = needShow ? "visible" : "hidden"
        customerLevelInput.value = "23"
    }
}

function selectLevel(level) {

    if (level < MP4EnCodeLevel.low || level > MP4EnCodeLevel.customer) {
        alertMessage("档位选择不合法");
        return;
    }

    var lowEs = document.getElementsByClassName('lowLevelButton')
    var midEs = document.getElementsByClassName('midLevelButton')
    var highEs = document.getElementsByClassName('highLevelButton')
    var customerEs = document.getElementsByClassName('customerButton')

    needShowAllCustomerInput(false)


    encodeLevel= level;

    var selectEs = lowEs;
    var otherEs = [midEs,highEs,customerEs];

    if (level == MP4EnCodeLevel.mid) {
        selectEs = midEs;
        otherEs = [lowEs,highEs,customerEs];
    } else if (level == MP4EnCodeLevel.high) {
        selectEs = highEs;
        otherEs = [midEs,lowEs,customerEs];
    } else if (level == MP4EnCodeLevel.customer) {
        selectEs = customerEs;
        otherEs = [midEs,lowEs,highEs];
        needShowAllCustomerInput(true)
    }

    needActiveAllSelectLevel(selectEs,true)

    for (var i = 0;i<otherEs.length;i++) {
        var levels = otherEs[i]
        needActiveAllSelectLevel(levels,false);
    }


}

function needActiveAllSelectLevel(levels,isActive) {

    var backgroundColor = isActive ? "#1473E6" : "#232323";
    var color = isActive ? "white" : "#8A8A8A" ;

    for (var i = 0;i<levels.length;i++) {
        var level = levels[i]
        level.style.backgroundColor = backgroundColor;
        level.style.color = color;
    }
}

function createTempFolder(callback) {
    // 创建日志目录
    // 创建 temp 文件夹
    deleteFolder(TEMP_SOURCE_PATH, true, true, function () {
        // 创建 temp 文件夹
        fs.mkdir(TEMP_SOURCE_PATH, function () {
            callback();
        });
    });
}

function createAELogDirIfNeed(callback) {
    LOG_PATH = nodePath.join(CURRENT_SOURCE_PATH, '插件日志');
    if (!fs.existsSync(LOG_PATH)) {
        fs.mkdir(LOG_PATH, function () {
            resetCurrentChangeLogFile();
            callback();
        });
    } else {
        resetCurrentChangeLogFile();
        callback();
    }
}

function resetCurrentChangeLogFile() {
    //获取日期与时间
    var myDate = new Date();
    var dataStr = myDate.toLocaleString()
    dataStr = dataStr.split("/").join("-");
    dataStr = dataStr.split(" ").join("_");

    dataStr = dataStr.split(":").join("_"); //windows特殊字符
    currentChanegFile = "logs_" + dataStr + ".txt";
}

function deleteFolder(path, isFirstFolder, delFirstFolder, callback) {

    try {
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function (file) {
                var curPath = nodePath.join(path, file);
                if (fs.statSync(curPath).isDirectory()) { // recurse
                    deleteFolder(curPath, false, true);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            if (!isFirstFolder || delFirstFolder) {
                fs.rmdirSync(path);
            }
        }

        if (isFirstFolder) {
            callback();
        }
    } catch (e) {
        if (isFirstFolder) {
            callback();
        }
    }

}

function deleteFile(path) {
    if (fs.existsSync(path)) {
        fs.unlinkSync(path);
    }
}

function startConvert() {

    if (outputPath == null || outputPath == undefined || outputPath == '') {
        alertMessage("请先选择输出路径");
        return;
    }

    createAELogDirIfNeed(function () {

        logFile("日志目录准备完成")

        if (!checkCRFValide(MP4ConverMode.dynamic)) {
            return;
        }

        _startConvert();
    })
}

function replaceSuffix(originUrl,extentionPath) {
    var lastDocIndex = originUrl.lastIndexOf('.')
    var outputPath_264 = originUrl.slice(0, lastDocIndex);
    var outputPath_265 = originUrl.slice(0, lastDocIndex);

    if (extentionPath != undefined) {
        outputPath_264 = outputPath_264 + "_" + extentionPath;
        outputPath_265 = outputPath_265 + "_" + extentionPath;
    }

    outputPath_264 = outputPath_264 + '_264'
    outputPath_265 = outputPath_265 + '_265'


    if (encodeLevel== MP4EnCodeLevel.low) {
        outputPath_264 = outputPath_264 + '_low.'
        outputPath_265 = outputPath_265 + '_low.'
    } else if (encodeLevel == MP4EnCodeLevel.mid) {
        outputPath_264 = outputPath_264 + '_mid.'
        outputPath_265 = outputPath_265 + '_mid.'
    } else if (encodeLevel == MP4EnCodeLevel.high) {
        outputPath_264 = outputPath_264 + '_high.'
        outputPath_265 = outputPath_265 + '_high.'
    }  else if (encodeLevel == MP4EnCodeLevel.customer) {
        outputPath_264 = outputPath_264 + '_crf' + customer_crf + '.'
        outputPath_265 = outputPath_265 + '_crf' + customer_crf + '.'
    }

    outputPath_264 = outputPath_264 + 'mp4'
    outputPath_265 = outputPath_265 + 'mp4'

    return {
        'path_264': outputPath_264,
        "path_265": outputPath_265
    }
}

function _startConvert() {

    showModalTip(true);

    progress = 0;
    updateProcess(progress)

    logFile('开始动态元素转换: level:' + encodeLevel + ",crf:" + customer_crf);
  
    createTempFolder(function () {
        progress = 0.1; 
        updateProcess(progress)
  
        var pathObj = replaceSuffix(outputPath,"dynamic")
        var outFile_264 = pathObj.path_264;
        var outFile_265 = pathObj.path_265;

        var tempPathObj = replaceSuffix(outputTempPath)
        var outputTempPath_264 = tempPathObj.path_264;
        var outputTempPath_265 = tempPathObj.path_265;

        var successMsg = "mp4转换成功"

        logFile('创建临时文件成功  \n 264输出临时路径' + outputTempPath_264 + '\n 265输出临时路径' + outputTempPath_265)

        progress = 0.3
        updateProcess(progress,"临时目录准备完成")

        csInterface.evalScript("startConverter('" + TEMP_SOURCE_PATH + "')", function (json) {
            progress = 0.5
            updateProcess(progress,"AE工程解析完成")
            if (json == 'undefined' || json == "") {
                logFile('json is undefined');
                showModalTip(false)
                return
            }
            var result = JSON.parse(json)
            var movFile = result["file"]
            var evaJson = result["evaJson"]
            movFile = changePathToPlatform(movFile)
            writeStringToTmpFile(evaJson, 'myOutput.txt');

            deleteFile(outputTempPath_264)
            deleteFile(outputTempPath_265)

            deleteFile(outFile_264)
            deleteFile(outFile_265)

            evaJson = zlibJson(evaJson)

            let success264 = false;
            let success265 = false;

            progress = 0.7;
            updateProcess(progress,"Json数据压缩完成");

            if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
                logFile('当前写入的类型是METADATA');
            } 

            convertAviToMP4(movFile, outputTempPath_264, encodeLevel, MP4EnCodeType.avc, function () {
                if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
                    // alertMessage("当前写入的类型是METADATA")
                    writeJsonToMp4MetaData(outputTempPath_264, outFile_264, evaJson);
                }  

                success264 = true
                logFile('完成转换264' + "success265 :" + success265 + "success264" + success264);

                progress += 0.1;
                updateProcess(progress,"h264的metadata数据已写入");

                if (success264 && success265) {
                    progress = 1;
                    updateProcess(progress);
                    setTimeout(() => {
                        showModalTip(false)
                        alertMessage(successMsg)
                    }, 250);
                    logFile('全部完成转换');
                }
            });

            convertAviToMP4(movFile, outputTempPath_265, encodeLevel, MP4EnCodeType.hevc, function () {
                if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
                    // alertMessage("当前写入的类型是METADATA")
                    writeJsonToMp4MetaData(outputTempPath_265, outFile_265, evaJson);
                }  
                success265 = true
                logFile('完成转换265' + "success265 :" + success265 + "success264" + success264);

                progress += 0.1;

                updateProcess(progress,"h265的metadata数据已写入");

                if (success264 && success265) {
                    progress = 1;
                    updateProcess(progress);
                    setTimeout(() => {
                        showModalTip(false)
                        alertMessage(successMsg)
                    }, 250);
                    logFile('全部完成转换');
                }
            });

        });
    });
}

function showModalTip(needShow) {
    var showStr = needShow ? "visible" : "hidden";
    document.getElementById('modal-overlay').style.visibility = showStr;
}

function showModalLogTip(needShow) {
    var showStr = needShow ? "visible" : "hidden";
    document.getElementById('modal-log-overlay').style.visibility = showStr;
}



function _startConvert_normal() {

    showModalTip(true);
    progress = 0;
    updateProcess(progress) 
    logFile('开始h264/h265转换: level:' + encodeLevel + ",crf:" + customer_crf);

    createTempFolder(function (result) {
        //日志必须从这里开始  
        logFile('创建临时文件成功')
        var pathObj = replaceSuffix(outputPath ,"normal")
        var outFile_264 = pathObj.path_264;
        var outFile_265 = pathObj.path_265; 
        var successMsg = "mp4转换成功" 
        logFile('264输出路径' + outFile_264 + '，265输出路径' + outFile_265); 
        progress = 0.3;
        updateProcess(progress,"临时文件准备成功"); 
        csInterface.evalScript("startConverter_Normal('" + TEMP_SOURCE_PATH + "')", function (movFile) {

            if (movFile == "undefined" || movFile == "" ||  movFile == null) {
                completeConvert_for_normal(false)
                return;
            }
  
            progress = 0.5;
            updateProcess(progress,"AE完成队列渲染")
            logFile('渲染的视频路径：' + movFile)
 

            movFile = changePathToPlatform(movFile)
            logFile('根据平台适配的视频路径：' + movFile);

            let success264 = false;
            let success265 = false;

            deleteFile(outFile_264)
            deleteFile(outFile_265)

            progress = 0.7;
            updateProcess(progress);

            convertAviToMP4(movFile, outFile_264, encodeLevel, MP4EnCodeType.avc, function () {
                success264 = true
                logFile('完成转换264')
                progress += 0.1
                updateProcess(progress)
                if (success264 && success265) {
                    progress = 1;
                    updateProcess(progress)
                    setTimeout(() => {
                        showModalTip(false)
                        alertMessage(successMsg)
                    }, 250);
                    logFile('全部完成转换')
                }
            });

            convertAviToMP4(movFile, outFile_265, encodeLevel, MP4EnCodeType.hevc, function () {
                success265 = true
                logFile('完成转换265');

                progress += 0.1;
                updateProcess(progress);

                if (success264 && success265) {

                    progress = 1;
                    updateProcess(progress);

                    setTimeout(() => {
                        alertMessage(successMsg)
                        showModalTip(false)
                    }, 250);
                    logFile('全部完成转换');
                }
            });
        });
    });
}

function completeConvert_for_normal(success,message = "")
{
    progress = 1;
    updateProcess(progress);
    showModalTip(false)
    logFile(success == true ? "转换成功" : "转换失败")
    if (message!=undefined && message != "") { 
        alertMessage(message)
    }  
}

function startConvert_normal() {

    if (outputPath == null || outputPath == undefined || outputPath == '') {
        alertMessage("请先选择输出路径");
        return;
    }

    createAELogDirIfNeed(function () {
        logFile("日志目录准备完成")

        if (!checkCRFValide(MP4ConverMode.normal)) {
            return;
        }

        _startConvert_normal();
    })
}

function checkCRFValide(mode) {
    if (encodeLevel == MP4EnCodeLevel.customer) {
        //只有在custom的时候需要检查crf
        var customerInput ;
        if (mode == MP4ConverMode.normal) {
            customerInput = document.getElementById('customerCRFInput_normal')
        } else if (mode == MP4ConverMode.dynamic) {
            customerInput = document.getElementById('customerCRFInput_dynamic')
        }

        var crf = customerInput.value;

        if (crf < 0 || crf > 51) {
            logFile("mode:" + mode + ",crf不合法：" + crf)
            alertMessage("crf:" + crf + "取值不合法,[0 <= crf <= 51]")
            customer_crf = 0;
            return false
        }
        logFile("mode:" + mode + ",crf合法" + crf)
        customer_crf = crf
        return true;
    }
    customer_crf = 0;
    return true
}

function addPathUpDot(path) {
    var outPath = '"' + path + '"';
    return outPath;
}

function convertAviToMP4(inputFile, outFile, level, encodeType, callback) {
    var params
    if (encodeType == MP4EnCodeType.avc) {
        var params = ' -c:v libx264 -x264-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k -crf 23.5 -preset 5 -y -vf format=yuv420p  '
        if (level == MP4EnCodeLevel.low) {
            params = ' -c:v libx264 -x264-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k -crf 29.5 -preset 5  -y -vf format=yuv420p  '
        } else if (level == MP4EnCodeLevel.high) {
            params = ' -c:v libx264 -x264-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k -crf 17.5 -preset 5 -y -vf format=yuv420p  '
        } else if (level == MP4EnCodeLevel.customer) {
            params = ' -c:v libx264 -x264-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k -crf ' + customer_crf + '  -preset 5 -y -vf format=yuv420p  '
        }
    } else if (encodeType == MP4EnCodeType.hevc) {
        var params = ' -c:v libx265 -x265-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k  -crf 28 -preset 5  -y -vf format=yuv420p  '
        if (level == MP4EnCodeLevel.low) {
            params = ' -c:v libx265 -x265-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k  -crf 34 -preset 5  -y -vf format=yuv420p  '
        } else if (level == MP4EnCodeLevel.high) {
            params = ' -c:v libx265 -x265-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k  -crf 22 -preset 5 -y -vf format=yuv420p  '
        } else if (level == MP4EnCodeLevel.customer) {
            params = ' -c:v libx265 -x265-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k -crf ' + customer_crf + '  -preset 5 -y -vf format=yuv420p  '
        }
    }
    var aviToMp4Cmd = addPathUpDot(ffmpegPath()) + ' -hide_banner ' + ' -i ' + addPathUpDot(inputFile) + params + addPathUpDot(outFile);
    //var aviToMp4Cmd =  addPathUpDot(x264Path()) + ' --qp 20 --preset placebo  -I 200 -r 4 -b 3 --me umh -i 1 --scenecut 60 -f 1:1 --qcomp 0.5 --ipratio 1 --ipratio 1 -o ' + addPathUpDot(outFile) + ' '+ addPathUpDot(inputFile);
    logFile(aviToMp4Cmd);
    var process = require('child_process');
    process.exec(aviToMp4Cmd, function (error, stdout, stderr) {
        logFile('StdOut=' + stdout);
        logFile('StdErr=' + stderr);
        callback();
    });
}

 

function writeJsonToMp4MetaData(mp4TempFile, mp4File, json) {
    if (json.length == 0) {
        alertMessage('转换完成');
        return;
    }
    // yyeffectmp4json[[base64]]
    var templateStart = "yyeffectmp4json[["
    var templateEnd = "]]yyeffectmp4json"
    json =  templateStart + json + templateEnd
    var writeJsonCmd = addPathUpDot(ffmpegPath()) + ' -i ' + addPathUpDot(mp4TempFile) + " -c copy -metadata mergeinfo=" +  json + " -movflags +use_metadata_tags " + addPathUpDot(mp4File);
    writeStringToTmpFile(writeJsonCmd, 'writeJsonToMp4MetaData.txt')
    logFile("写入Json到MetaData" + ",mp4TempFile:" + mp4TempFile + ",mp4File:" + mp4File)
    var process = require('child_process');
    process.exec(writeJsonCmd, function (error, stdout, stderr) {
        logFile("mov转MP4完成")
        callback();
    });
}

function ffmpegPath() {
    var osVersion = getOSVersion();
    if (osVersion == OS_VERSION_WINDOWS)
        return changePathToPlatform(nodePath.resolve(ffmpegUrl_windows));

    return changePathToPlatform(nodePath.resolve(ffmpegUrl_mac));
}

function changePathToPlatform(path) {
    var osVersion = getOSVersion();
    if (osVersion == OS_VERSION_WINDOWS) {
        path = path.split("\\").join("\\\\");
    }
    return path;
}

function getOSVersion() {
    var OSVersion = csInterface.getOSInformation();
    if (OSVersion.indexOf("Windows") >= 0) {
        return OS_VERSION_WINDOWS;
    }
    return OS_VERSION_MAC;
}

function writeStringToTmpFile(string, file) //'\\myOutput.txt'
{
    var outputFile = pathSeprator() + file
    fs.appendFileSync(TEMP_SOURCE_PATH + outputFile, string + '\n')
}

function getBaseLog(isJs) {
    var tag = isJs ? "js" : "jsx"
    var base = '[' + tag +  ']' + '[' + CEP_Plugin_Version + ']' + ">>>";
    return base
}

function logFile(logText) {
    var outputFile = LOG_PATH + pathSeprator() + currentChanegFile

    //格式
    fs.appendFileSync(outputFile, getBaseLog(true)  + logText + '\n' + '\n')
}

function logJSXFile(logText) {
    var outputFile = LOG_PATH + pathSeprator() + currentChanegFile
    fs.appendFileSync(outputFile, getBaseLog(false)   + logText + '\n'  + '\n')
}


function pathSeprator() {
    var OSVersion = csInterface.getOSInformation();
    if (OSVersion.indexOf("Windows") >= 0) {
        return "\\"
    } else {
        return "/"
    }
}

function updateProcess(progress,message="转换中...") {
    document.getElementById('transform-tips').innerText = message + ' ' + progress * 100 + "%";
}


function zlibJson(json) {

    if (json == undefined) {
        return
    }
    var zlib = require('zlib');
    var Buffer = require('buffer').Buffer

// Calling deflateSync method
    var deflated = zlib.deflateSync(json).toString('base64');
    writeStringToTmpFile(deflated,"myOutput_deflated.txt")

    logFile("转码前的长度：" + json.length)

// Calling inflateSync method
    var inflated = zlib.inflateSync(Buffer.from(deflated, 'base64'));
    writeStringToTmpFile(inflated,"myOutput_inflated.txt")

    logFile("转码后的长度：" + deflated.length)

    return deflated;

}
 

