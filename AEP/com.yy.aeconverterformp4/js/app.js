
/**
 * index.html对应的JS文件
 * Author:Guoyabin YY Inc
 */

var csInterface = new CSInterface();
var nodePath = require("path");

var curExtensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
var ffmpegUrl_windows = nodePath.join(curExtensionPath, 'localbin//windows/ffmpeg.exe');
var ffmpegUrl_mac = nodePath.join(curExtensionPath, 'localbin/mac/ffmpeg');
var aePluginLogFile = nodePath.join(csInterface.getSystemPath(SystemPath.MY_DOCUMENTS), 'aepluginLog.txt');
var versionFileUrl = 'https://raw.githubusercontent.com/yylive/YYEVA/main/AEP/upgradeMsgFile'
var versionDownloadFile = nodePath.join(csInterface.getSystemPath(SystemPath.MY_DOCUMENTS), 'upgradeMsgFile.txt');
var zxpUrl = "https://raw.githubusercontent.com/yylive/YYEVA/main/AEP/build/2.1.1/updateFile/update.zxp";
var zxpFile = nodePath.join(csInterface.getSystemPath(SystemPath.MY_DOCUMENTS), 'updateAE.zxp');
var fs = require('fs')
var spawn = require('child_process');
var AdmZip = require("adm-zip");
https = require('https');
var esp = require("cep-extendscript-eval-promise")

var UpgradeErrorCode_ZipZXPFile = 1
var UpgradeErrorCode_ZipFFmpegFile = 1


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

process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0

var MP4EnCodeLevel = {
  low: 0,
  mid: 1,
  high: 2,
  customer: 3,
};

var MP4EnCodeType = {
  avc: 0,
  hevc: 1
};

var MP4ConverMode = {
  normal: 0,
  dynamic: 1
}

var encodeLevel = MP4EnCodeLevel.mid;

var LogFile = 'Log.txt'
var currentChanegFile = "logs ";

var progress = 0;

function upgradeErrorCodeMessage(errorCode, msg) {
  return "升级失败[code= " + UpgradeErrorCode_ZipZXPFile + "]，请联系管理员QQ群:981738110\n 失败原因：" + msg
}

function checkUpradeIfNeed() {
  if (fs.existsSync(aePluginLogFile)) {
    fs.unlinkSync(aePluginLogFile)
    aePluginLog("插件日志：" + aePluginLogFile + "删除成功")
  }
  aePluginLog("开始下载VersionFile文件：" + versionFileUrl)
  //check 版本

  var upgradeMsg = "Hi，YYEVA插件有更新的版本了哦，更新一下? \\n tip: 下载过慢可以到官网下载最新版本安装哦。"

  downloadFileWithLog(versionFileUrl, versionDownloadFile, function (progress) {
    showModalUpgradeTip("下载VersionFile文件中," + progress + "%")
  }, function (error) {
    aePluginLog("下载VersionFile文件失败，升级失败")
    return
  }, function () {
    showModalUpgradeTip(true, "检测升级中...")
    var data
    var newestVersion = 0
    var currentVersion = 0
    if (fs.existsSync(versionDownloadFile)) {
      var dataString = fs.readFileSync(versionDownloadFile, 'utf-8');
      aePluginLog("versionFile文件读取" + dataString)
      try {
        data = JSON.parse(dataString)
        aePluginLog("versionFile文件解析" + data)
      } catch (error) {
        aePluginLog("versionFile文件解析失败" + error)
      }
      aePluginLog("versionFile文件解析完成：" + data.msg)
      newestVersion = data.version
      upgradeMsg = "Hi，YYEVA插件有更新的版本了哦，更新一下? \\n" + data.msg
    }
    aePluginLog("versionFile文件下载完成：" + versionDownloadFile + ",newestVersion:" + newestVersion)
    var CURRENT_PROJECT_PATH = csInterface.getSystemPath(SystemPath.APPLICATION);
    var saveVersFile = nodePath.join(CURRENT_PROJECT_PATH, 'versionFile')

    if (fs.existsSync(saveVersFile)) {
      currentVersion = parseInt(fs.readFileSync(saveVersFile, 'utf-8'));
    }
    aePluginLog("version对比 newestVersion:" + newestVersion + "----currentVersion:" + currentVersion)
    if (fs.existsSync(versionDownloadFile)) {
      fs.unlinkSync(versionDownloadFile)
    }
    var fmpagBefore = nodePath.join(CURRENT_PROJECT_PATH, '/localbin/windows/ffmpeg.exe')
    //判断是否包含ffmpeg文件
    if (csInterface.getOSInformation().indexOf("Mac") >= 0) {
      fmpagBefore = nodePath.join(CURRENT_PROJECT_PATH, '/localbin/mac/ffmpeg')
    }
    aePluginLog("fmpagBefore文件地址:" + fmpagBefore)
    var hasNewVersion = currentVersion < newestVersion

    if (!fs.existsSync(fmpagBefore)) {
      aePluginLog("fmpagBefore不存在，强制再下载一遍 no exits fmpagBefore")
      hasNewVersion = true
    }

    if (!hasNewVersion) {
      showModalUpgradeTip(false, "检测升级中")
      return
    }

    aePluginLog("hasNewVersion：" + hasNewVersion)

    if (hasNewVersion) {
      confirmMessages(upgradeMsg, function () {
        var ffmpegFile
        var ffmpegDonwloadFile
        var ffmpegInExtensionFile
        showModalUpgradeTip(true, "升级中...\n下载ZXP安装包")
        aePluginLog("begin Donwload zxpUrl:" + zxpUrl)
        aePluginLog("下载的地址:zxpFile:" + zxpFile)

        //下载unzip包 


        downloadFileWithLog(zxpUrl, zxpFile, function (progress) {
          showModalUpgradeTip(true, "下载ZXP安装包中," + progress + "%")
        }, function (err) {
          aePluginLog("下载zxpFile文件失败，升级失败")
          return
        }, function () {
          aePluginLog("Donwload zxp success")
          showModalUpgradeTip(true, "升级中\n删除旧的ZXP安装包")

          ffmpegFile_zip = nodePath.join(csInterface.getSystemPath(SystemPath.MY_DOCUMENTS), 'ffmpeg.zip');
          showModalUpgradeTip(true, "升级中\n解压缩zxp包")
          if (csInterface.getOSInformation().indexOf("Mac") >= 0) {
            ffmpegFile = nodePath.join(csInterface.getSystemPath(SystemPath.MY_DOCUMENTS), 'ffmpeg');
            ffmpegDonwloadFile = "https://raw.githubusercontent.com/yylive/YYEVA/main/AEP/build/mac/ffmpeg.zip";
            ffmpegInExtensionFile = nodePath.join(CURRENT_PROJECT_PATH, '/localbin/mac/ffmpeg')
          } else {
            ffmpegDonwloadFile = "https://raw.githubusercontent.com/yylive/YYEVA/main/AEP/build/windows/ffmpeg.zip";
            ffmpegFile = nodePath.join(csInterface.getSystemPath(SystemPath.MY_DOCUMENTS), 'ffmpeg.exe');
            ffmpegInExtensionFile = nodePath.join(CURRENT_PROJECT_PATH, '/localbin/windows/ffmpeg.exe')
          }
          aePluginLog("ffmpegFile:" + ffmpegFile + "----" + "ffmpegDonwloadFile:" + ffmpegDonwloadFile + "----" + "ffmpegInExtensionFile:" + ffmpegInExtensionFile + "----" + "ffmpegFile_zip:" + ffmpegFile_zip)

          var zxpZipTool = new AdmZip(zxpFile)
          aePluginLog("解压缩zxpFile:" + zxpFile)

          zxpZipTool.extractAllToAsync(CURRENT_PROJECT_PATH, true, true, function (error) {
            if (error) {
              var errorMessage = upgradeErrorCodeMessage(UpgradeErrorCode_ZipZXPFile, error.message)
              aePluginLog(errorMessage)
              alert(upgradeErrorCodeMessage(errorMessage))
              return
            }
            aePluginLog("完成解压缩zxpFile:" + zxpFile)
            var hasFmpg = fs.existsSync(ffmpegFile)
            var hasFmpgInExtension = fs.existsSync(ffmpegInExtensionFile)

            if (!hasFmpgInExtension) {
              aePluginLog("hasFmpg文件是否存在:" + hasFmpg)
              if (hasFmpg) {
                showModalUpgradeTip(true, "准备ffmpeg环境，大概几分钟就可以完成...拷贝中")
                fs.chmodSync(ffmpegFile, 0o777)
                aePluginLog("修改权限文件成功")
                //拷贝过来
                try {
                  aePluginLog("复制文件")
                  fs.copyFileSync(ffmpegFile, ffmpegInExtensionFile, fs.constants.COPYFILE_EXCL)
                  aePluginLog("复制城")
                  fs.unlinkSync(zxpFile)
                  aePluginLog("删除成功")
                  alertMessage("更新完成，即将重启。")
                  csInterface.closeExtension()
                } catch (e) {
                  alertMessage(e)
                }
              } else {
                showModalUpgradeTip(true, "准备ffmpeg环境，大概几分钟就可以完成...下载中")
                aePluginLog("不存在ffmpeg，需要下载")
                downloadFileWithLog(ffmpegDonwloadFile, ffmpegFile_zip, function (progress) {
                  showModalUpgradeTip(true, "下载ffmpeg安装包中," + progress + "%")
                }, function (err) {
                  aePluginLog("下载ffmpeg文件失败，升级失败")
                  return
                }, function () {
                  aePluginLog("开始解压缩ffmepg.zip：" + ffmpegFile_zip)
                  if (fs.existsSync(ffmpegFile_zip)) {
                    var ffmpegZipTool = new AdmZip(ffmpegFile_zip)
                    ffmpegZipTool.extractAllToAsync(/*target path*/csInterface.getSystemPath(SystemPath.MY_DOCUMENTS), /*overwrite*/ true, true, function (error) {
                      if (error) {
                        var errorMessage = upgradeErrorCodeMessage(UpgradeErrorCode_ZipFFmpegFile, error.message)
                        aePluginLog(errorMessage)
                        alert(upgradeErrorCodeMessage(errorMessage))
                        return
                      }
                      aePluginLog("解压缩ffmepg.zip：成功" + ffmpegFile_zip + ",ffmpegFile:" + ffmpegFile + "isExits:" + fs.existsSync(ffmpegFile))
                      fs.chmodSync(ffmpegFile, 0o777)
                      aePluginLog("修改ffmpegFile权限成功成功" + ffmpegFile)
                      try {
                        aePluginLog("拷贝ffmpegFile到插件目录" + ffmpegInExtensionFile)
                        fs.copyFileSync(ffmpegFile, ffmpegInExtensionFile, fs.constants.COPYFILE_EXCL)
                        aePluginLog("拷贝ffmpegFile到插件成功")
                        fs.unlinkSync(zxpFile);
                        alertMessage("更新完成，即将重启。")
                        csInterface.closeExtension()
                      } catch (e) {
                        alertMessage(e)
                      }
                    })
                  } else {
                    aePluginLog("解压缩ffmepg.zip失败，文件不存在：" + ffmpegFile_zip)
                  }

                })
              }
            } else {
              fs.unlinkSync(zxpFile);
              alertMessage("更新完成，即将重启。")
              csInterface.closeExtension()
            }
          })
        });
      }, function () {
        aePluginLog("手动取消升级 cancel upgrade")
        showModalUpgradeTip(false, "检测升级中")
      });
    }
  });
}


function downloadFileWithLog(url, filename, progressCallback, failcallback, callback) {
  // var stream = fs.createWriteStream(filename);  
  // request(uri).pipe(stream).on('close', callback);
  
  https.get(url, (res) => {
    // Open file in local filesystem
    const len = res.headers["content-length"]
    let cur = 0
    const total = (len / 1048576).toFixed(2) // 转为M 1048576 - bytes in  1Megabyte
    const file = fs.createWriteStream(filename);
    // Write data into local file

    res.on('data', function (chunk) {
      cur += chunk.length
      const progress = (100.0 * cur / len).toFixed(2) // 当前进度
      const currProgress = (cur / 1048576).toFixed(2) // 当前了多少
      progressCallback(Math.floor(progress))
    })
    res.pipe(file);
    // Close the file
    file.on('finish', () => {
      file.close();
      aePluginLog("Donwload url:" + url + ",fileName:" + filename + "Success")
      callback()
    });
  }).on("error", (err) => {
    aePluginLog("Error : Donwload url:" + url + ",fileName:" + filename + " Failure:" + err.message)
    failcallback(err.message)
  });
}


function downloadFile(url, filename, callback) {
  // var stream = fs.createWriteStream(filename);  
  // request(uri).pipe(stream).on('close', callback);

  https.get(url, (res) => {
    // Open file in local filesystem
    const file = fs.createWriteStream(filename);
    // Write data into local file
    res.pipe(file);
    // Close the file
    file.on('finish', () => {
      file.close();
      console.log(`File downloaded!`);
      callback()
    });
  }).on("error", (err) => {
    console.log("Error: ", err.message);
  });
}


function confirmMessages(message, callbackTrue, callbackFalse) {
  csInterface.evalScript("confirmMessage('" + message + "');", function (result) {

    if (result == 'true') {
      callbackTrue();

    } else {
      callbackFalse();
    }
  });
}



function deleteFloder(path, isFirstFolder, delFirstFolder, callback) {
  try {
    if (fs.existsSync(path)) {
      fs.readdirSync(path).forEach(function (file) {
        var curPath = nodePath.join(path, file);
        if (fs.statSync(curPath).isDirectory()) { // recurse
          deleteFloder(curPath, false, true);
        } else { // delete file
          fs.unlinkSync(curPath);
        }
      });
      if (!isFirstFolder || delFirstFolder) {
        fs.rmdirSync(path);
      }
    }
  } catch (e) {
    if (isFirstFolder) {
      aePluginLog("path:" + path + "写入失败,error:" + e)
    }
  } finally {
    if (isFirstFolder) {
      callback();
    }
  }

}

function aeLogMessageEvent(myEvent) {
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

  if (version != undefined) {
    CEP_Plugin_Version = version;
  } else {
    CEP_Plugin_Version = "Unknown";
  }



  return version
}


window.onload = function () {

  csInterface.addEventListener("LogMessageEvent", aeLogMessageEvent)
  //需要补充 active project change事件
  var version = (getPluginVersion())

  document.getElementById("ae_ver_text").innerText = "插件版本:" + version;

  checkUpradeIfNeed()

  checkEnvironments()

}

function checkEnvironments() {
  checkYYEVATemplate()
  checkYYEVAFfmpegTemplate()
}


function checkYYEVATemplate() {
  esp.evalScript("checkHasConverTemplate()").then(out => {

    if (out == "0") {
      document.getElementById("yyevaTemplateExitsLabel").innerHTML = "检查YYEVA模板完成--- 【❌❌❌❌❌】检查失败"
    } else if (out == "1") {
      document.getElementById("yyevaTemplateExitsLabel").innerHTML = "检查YYEVA模板完成--- 【❌❌❌❌❌】YYEVA模板不存在"
    } else if (out == "2") {
      document.getElementById("yyevaTemplateExitsLabel").innerHTML = "检查YYEVA模板完成--- 【✅✅✅✅✅】YYEVA模板存在"
    }
  });
}

function checkYYEVAFfmpegTemplate() {
  var ffmpegUrl_windows = nodePath.join(curExtensionPath, 'localbin//windows/ffmpeg.exe');
  var ffmpegUrl_mac = nodePath.join(curExtensionPath, 'localbin/mac/ffmpeg');
  var ffmpegFile = false
  if (csInterface.getOSInformation().indexOf("Mac") >= 0) {
    ffmpegFile = ffmpegUrl_mac
  } else {
    ffmpegFile = ffmpegUrl_windows
  }
  if (fs.existsSync(ffmpegFile)) {
    document.getElementById("ffmpegExitsLabel").innerHTML = "检查ffmpeg环境完成---【✅✅✅✅✅】 ffmpeg文件已存在"
  } else {
    document.getElementById("ffmpegExitsLabel").innerHTML = "检查ffmpeg环境完成---【❌❌❌❌❌】 ffmpeg文件不存在 请咨询qq群:981738110"
  }


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


    var os = require('os');
    var homedir = os.homedir();
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

  zip.addLocalFolderAsync(LOG_PATH, function (success, error) {
    writeCount++;
    if (writeCount == 2) {
      writeZipPromise(zip, outputLogPath)
    }
  }, "ae_log")

  zip.addLocalFolderAsync(TEMP_SOURCE_PATH, function (success, error) {
    writeCount++;
    if (writeCount == 2) {
      writeZipPromise(zip, outputLogPath)
    }
  }, "temp_log")
}

function writeZipPromise(zip, path) {
  zip.writeZip(/*target file name*/ path, function () {
    alertMessage("导出成功")
    //打开目录
    showModalLogTip(false)
  });

}


function selectPath() {

  updateInfo(function (success) {

    var result = window.cep.fs.showSaveDialogEx("选择保存目录", CURRENT_SOURCE_PATH, ["mp4"], CURRENT_SOURCE_NAME + '.mp4', '');
    TEMP_SOURCE_PATH = nodePath.join(CURRENT_SOURCE_PATH, '_temp_');
    outputTempPath = nodePath.join(TEMP_SOURCE_PATH, 'temp_change.mp4');

    TEMP_SOURCE_PATH = changePathToPlatform(TEMP_SOURCE_PATH)
    outputTempPath = changePathToPlatform(outputTempPath)
    if (result.data) {
      outputPath = changePathToPlatform(result.data);
      document.getElementById("pathtext").innerHTML = outputPath
    }
  });
}

function cleanProject() {
  //清空当前目录选择
  outputTempPath = undefined;
  TEMP_SOURCE_PATH = undefined;
  outputPath = undefined;
  // document.getElementById("pathtext_dynamic").innerHTML = "未设置"
  document.getElementById("pathtext").innerHTML = "未设置"
  selectLevel(1);
}

function needShowAllCustomerInput(needShow) {

  var customerEs = document.getElementsByClassName('customerCRFInput')

  for (var i = 0; i < customerEs.length; i++) {
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


  encodeLevel = level;

  var selectEs = lowEs;
  var otherEs = [midEs, highEs, customerEs];

  if (level == MP4EnCodeLevel.mid) {
    selectEs = midEs;
    otherEs = [lowEs, highEs, customerEs];
  } else if (level == MP4EnCodeLevel.high) {
    selectEs = highEs;
    otherEs = [midEs, lowEs, customerEs];
  } else if (level == MP4EnCodeLevel.customer) {
    selectEs = customerEs;
    otherEs = [midEs, lowEs, highEs];
    needShowAllCustomerInput(true)
  }

  needActiveAllSelectLevel(selectEs, true)

  for (var i = 0; i < otherEs.length; i++) {
    var levels = otherEs[i]
    needActiveAllSelectLevel(levels, false);
  }


}

function needActiveAllSelectLevel(levels, isActive) {

  var backgroundColor = isActive ? "#1473E6" : "#232323";
  var color = isActive ? "white" : "#8A8A8A";

  for (var i = 0; i < levels.length; i++) {
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

function aeVersion() {
  var version = getPluginVersion()
  alertMessage("当前插件的版本为:" + version)
}

function aeInstallPath() {
  var path = csInterface.getSystemPath(SystemPath.APPLICATION);
  alertMessage("当前插件的安装路径为:" + path)
}

function beginConverter() {
  if (outputPath == null || outputPath == undefined || outputPath == '') {
    alertMessage("请先选择输出路径");
    return;
  }

  createAELogDirIfNeed(function () {

    logFile("日志目录准备完成")

    if (!checkCRFValide()) {
      return;
    }

    _beginConveterInternal();
  })
}


function replaceSuffix(originUrl, extentionPath) {
  var lastDocIndex = originUrl.lastIndexOf('.')
  var outputPath_264 = originUrl.slice(0, lastDocIndex);
  var outputPath_265 = originUrl.slice(0, lastDocIndex);

  if (extentionPath != undefined) {
    outputPath_264 = outputPath_264 + "_" + extentionPath;
    outputPath_265 = outputPath_265 + "_" + extentionPath;
  }

  outputPath_264 = outputPath_264 + '_264'
  outputPath_265 = outputPath_265 + '_265'


  if (encodeLevel == MP4EnCodeLevel.low) {
    outputPath_264 = outputPath_264 + '_low.'
    outputPath_265 = outputPath_265 + '_low.'
  } else if (encodeLevel == MP4EnCodeLevel.mid) {
    outputPath_264 = outputPath_264 + '_mid.'
    outputPath_265 = outputPath_265 + '_mid.'
  } else if (encodeLevel == MP4EnCodeLevel.high) {
    outputPath_264 = outputPath_264 + '_high.'
    outputPath_265 = outputPath_265 + '_high.'
  } else if (encodeLevel == MP4EnCodeLevel.customer) {
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


function showModalTip(needShow) {
  var showStr = needShow ? "visible" : "hidden";
  document.getElementById('modal-overlay').style.visibility = showStr;
}

function showModalUpgradeTip(needShow, text) {
  var showStr = needShow ? "visible" : "hidden";
  document.getElementById('modal-upgrade-overlay').style.visibility = showStr;
  document.getElementById('transform-upgrade-tips').innerText = text;
}

function showModalLogTip(needShow) {
  var showStr = needShow ? "visible" : "hidden";
  document.getElementById('modal-log-overlay').style.visibility = showStr;
}

function _beginConveterInternal() {

  showModalTip(true);

  progress = 0;
  updateProcess(progress)
  logFile('开始插件转换: level:' + encodeLevel + ",crf:" + customer_crf);

  var checkbox = document.getElementById('scalaAlphaBox');

  var alphaRatioLevel = checkbox.checked

  createTempFolder(function () {
    progress = 0.1;
    updateProcess(progress)
    progress = 0.3
    updateProcess(progress, "临时目录准备完成")

    logFile('beginConverter star')

    esp.evalScript("beginConverter('" + TEMP_SOURCE_PATH + "'," + "'" + alphaRatioLevel + "')").then(out => {
      progress = 0.5
      updateProcess(progress, "图层解析完毕，开始渲染")
      logFile('beginConverter end')

      if (out == undefined) {
        logFile("beginConverter end undefined")
        return
      }
      logFile('nextDeal begin')
      function nextDellComplete(resJson) {
        progress = 0.7
        updateProcess(progress, "合成渲染完毕，开始输出资源")

        var res = JSON.parse(resJson)
        var mode = res["mode"]
        var data = res["data"]

        var pathObj = mode == 1 ? replaceSuffix(outputPath, "normal") : replaceSuffix(outputPath, "dynamic")
        var outFile_264 = pathObj.path_264;
        var outFile_265 = pathObj.path_265;

        var tempPathObj = replaceSuffix(outputTempPath)
        var outputTempPath_264 = tempPathObj.path_264;
        var outputTempPath_265 = tempPathObj.path_265;

        var successMsg = "mp4转换成功"

        logFile('创建临时文件成功  \n 264输出临时路径' + outputTempPath_264 + '\n 265输出临时路径' + outputTempPath_265)

        var jsonStr = data
        progress = 0.8
        updateProcess(progress, "AE工程解析完成")
        if (jsonStr == 'undefined' || jsonStr == "") {
          logFile('json is undefined');
          showModalTip(false)
          return
        }
        var result = JSON.parse(jsonStr)
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

        progress = 0.9;
        updateProcess(progress, "Json数据压缩完成");

        if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
          logFile('当前写入的类型是METADATA');
        }

        convertAviToMP4(movFile, outputTempPath_264, encodeLevel, MP4EnCodeType.avc, function () {
          if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
            // alertMessage("当前写入的类型是METADATA")
            var shFile = 'tmp_write_h264.bat'
            if (csInterface.getOSInformation().indexOf("Mac") >= 0) {
              shFile = 'tmp_write_h264.sh'
            }
            writeJsonToMp4MetaData(outputTempPath_264, outFile_264, evaJson, shFile);
          }

          success264 = true
          logFile('完成转换264' + "success265 :" + success265 + "success264" + success264);

          updateProcess(progress, "h264的metadata数据已写入");

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
            var shFile = 'tmp_write_h265.bat'
            if (csInterface.getOSInformation().indexOf("Mac") >= 0) {
              shFile = 'tmp_write_h265.sh'
            }
            writeJsonToMp4MetaData(outputTempPath_265, outFile_265, evaJson, shFile);
          }
          success265 = true
          logFile('完成转换265' + "success265 :" + success265 + "success264" + success264);


          updateProcess(progress, "h265的metadata数据已写入");

          if (success264 && success265) {
            progress = 1;
            updateProcess(progress);
            // setTimeout(() => {
            //     showModalTip(false)
            //     alertMessage(successMsg)
            // }, 250);
            logFile('全部完成转换');
            _checkAndconvertAlpha()
          }
        });
      }

      var outJson = JSON.parse(out)
      var mode = outJson["mode"]

      if (mode == 1) {
        nextDellComplete(out)
      } else {
        esp.evalScript("nextDeal()").then(resJson => nextDellComplete(resJson));
      }

    })

    // csInterface.evalScript("beginConverter('" + TEMP_SOURCE_PATH + "')", function (out) {
    // });
  });
}

function _checkAndconvertAlpha() {

  var successMsg = "mp4转换成功"

  logFile('checkAlphaExist start')
  esp.evalScript("checkAlphaExist()").then(out => {
    logFile('checkAlphaExist end' + out)

    if (out === 'true') {
      setTimeout(() => {
        showModalTip(false)
        alertMessage(successMsg)
        deleteFolder(TEMP_SOURCE_PATH)
      }, 250);
      logFile('checkAlphaExist end alpha exist')
      return
    }
    esp.evalScript("startConverter_Alpha('" + TEMP_SOURCE_PATH + "'," + "'" + true + "')").then(out => {
      progress = 0.5
      updateProcess(progress, "图层解析完毕，开始渲染")
      logFile('startConverter_Alpha end')

      if (out == undefined) {
        logFile("startConverter_Alpha end undefined")
        return
      }
      function nextDellComplete(resJson) {
        logFile('startConverter_Alpha nextDellComplete' + resJson)

        progress = 0.7
        updateProcess(progress, "合成渲染完毕，开始输出资源")

        var res = JSON.parse(resJson)
        var data = res["data"]

        var pathObj = replaceSuffix(outputPath, "alpha")
        var outFile_264 = pathObj.path_264;
        var outFile_265 = pathObj.path_265;

        var tempPathObj = replaceSuffix(outputTempPath, "alpha")
        var outputTempPath_264 = tempPathObj.path_264;
        var outputTempPath_265 = tempPathObj.path_265;


        logFile('startConverter_Alpha 创建临时文件成功  \n 264输出临时路径' + outputTempPath_264 + '\n 265输出临时路径' + outputTempPath_265)

        var jsonStr = data
        progress = 0.8
        updateProcess(progress, "AE工程解析完成")
        if (jsonStr == 'undefined' || jsonStr == "" || jsonStr === undefined) {
          logFile('json is undefined');
          showModalTip(false)
          return
        }
        var result;
        try {
          result = JSON.parse(jsonStr)
        } catch (error) {
          logFile('startConverter_Alpha JSON.parse error' + error)
        }
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

        progress = 0.9;
        updateProcess(progress, "Json数据压缩完成");

        if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
          logFile('当前写入的类型是METADATA');
        }

        convertAviToMP4(movFile, outputTempPath_264, encodeLevel, MP4EnCodeType.avc, function () {
          if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
            // alertMessage("当前写入的类型是METADATA")
            var shFile = 'tmp_write_h264.bat'
            if (csInterface.getOSInformation().indexOf("Mac") >= 0) {
              shFile = 'tmp_write_h264.sh'
            }
            writeJsonToMp4MetaData(outputTempPath_264, outFile_264, evaJson, shFile);
          }

          success264 = true
          logFile('完成转换264' + "success265 :" + success265 + "success264" + success264);

          updateProcess(progress, "h264的metadata数据已写入");

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
            var shFile = 'tmp_write_h265.bat'
            if (csInterface.getOSInformation().indexOf("Mac") >= 0) {
              shFile = 'tmp_write_h265.sh'
            }
            writeJsonToMp4MetaData(outputTempPath_265, outFile_265, evaJson, shFile);
          }
          success265 = true
          logFile('完成转换265' + "success265 :" + success265 + "success264" + success264);


          updateProcess(progress, "h265的metadata数据已写入");

          if (success264 && success265) {
            progress = 1;
            updateProcess(progress);
            setTimeout(() => {
              showModalTip(false)
              alertMessage(successMsg)
              deleteFolder(TEMP_SOURCE_PATH)
            }, 250);
            logFile('全部完成转换');
          }
        });
      }

      var outJson = JSON.parse(out)

      nextDellComplete(out)


    })
  })

}


function _startConvert() {

  showModalTip(true);

  progress = 0;
  updateProcess(progress)

  logFile('开始动态元素转换: level:' + encodeLevel + ",crf:" + customer_crf);

  createTempFolder(function () {
    progress = 0.1;
    updateProcess(progress)

    var pathObj = replaceSuffix(outputPath, "dynamic")
    var outFile_264 = pathObj.path_264;
    var outFile_265 = pathObj.path_265;

    var tempPathObj = replaceSuffix(outputTempPath)
    var outputTempPath_264 = tempPathObj.path_264;
    var outputTempPath_265 = tempPathObj.path_265;

    var successMsg = "mp4转换成功"

    logFile('创建临时文件成功  \n 264输出临时路径' + outputTempPath_264 + '\n 265输出临时路径' + outputTempPath_265)

    progress = 0.3
    updateProcess(progress, "临时目录准备完成")

    csInterface.evalScript("startConverter('" + TEMP_SOURCE_PATH + "')", function (json) {

    });
  });
}

function _startConvert_normal() {

  showModalTip(true);
  progress = 0;
  updateProcess(progress)
  logFile('开始h264/h265转换: level:' + encodeLevel + ",crf:" + customer_crf);

  createTempFolder(function (result) {
    //日志必须从这里开始  
    logFile('创建临时文件成功')
    var pathObj = replaceSuffix(outputPath, "normal")
    var outFile_264 = pathObj.path_264;
    var outFile_265 = pathObj.path_265;
    var successMsg = "mp4转换成功"
    logFile('264输出路径' + outFile_264 + '，265输出路径' + outFile_265);
    progress = 0.3;
    updateProcess(progress, "临时文件准备成功");
    csInterface.evalScript("startConverter_Normal('" + TEMP_SOURCE_PATH + "')", function (movFile) {

      if (movFile == "undefined" || movFile == "" || movFile == null) {
        completeConvert_for_normal(false)
        return;
      }

      progress = 0.5;
      updateProcess(progress, "AE完成队列渲染")
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

function completeConvert_for_normal(success, message = "") {
  progress = 1;
  updateProcess(progress);
  showModalTip(false)
  logFile(success == true ? "转换成功" : "转换失败")
  if (message != undefined && message != "") {
    alertMessage(message)
  }
}

function checkCRFValide() {
  if (encodeLevel == MP4EnCodeLevel.customer) {
    //只有在custom的时候需要检查crf
    var customerInput = document.getElementById('customerCRFInput')

    var crf = customerInput.value;

    if (crf < 0 || crf > 51) {
      logFile("crf不合法：" + crf)
      alertMessage("crf:" + crf + "取值不合法,[0 <= crf <= 51]")
      customer_crf = 0;
      return false
    }
    logFile(",crf合法" + crf)
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
      params = ' -c:v libx264 -x264-params "me=umh:scenecut=60:ref=4:deblock=1:bframes=3:keyint=300:keyint_min=1:qcomp=0.50:aq-mode=2:aq-strength=0.8:psy_rd=0.3"  -c:a aac -b:a 128k -crf ' + customer_crf + '  -preset 5 -y -vf format=yuv420p  '
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

function dealSpaceDir(dir) {
  return dir.replace(" ", "\\ ")
}


function writeJsonToMp4MetaData(mp4TempFile, mp4File, json, shFile) {
  if (json.length == 0) {
    alertMessage('转换完成');
    return;
  }
  // yyeffectmp4json[[base64]]
  var templateStart = "yyeffectmp4json[["
  var templateEnd = "]]yyeffectmp4json"
  json = templateStart + json + templateEnd
  var writeJsonCmd = addPathUpDot(ffmpegPath()) + ' -i ' + addPathUpDot(mp4TempFile) + " -c copy -metadata mergeinfo=" + json + " -movflags +use_metadata_tags -y " + addPathUpDot(mp4File);
  var writeSHFile = writeStringToTmpFileNeedDealPath(writeJsonCmd, shFile)


  //获取最后一个.的位置
  var index = shFile.lastIndexOf(".");
  //获取后缀
  var ext = shFile.substr(index + 1);
  var shellCommand = 'sh ' + dealSpaceDir(writeSHFile)
  if (ext == "sh") {
    //sh mac
    shellCommand = 'sh ' + dealSpaceDir(writeSHFile)
  } else {
    //windows的bat要针对中文做特殊处理
    shellCommand = 'chcp 65001 | ' + dealSpaceDir(writeSHFile)
  }

  logFile("写入Json到MetaData" + writeJsonCmd)
  logFile("command:" + shellCommand)
  var process = require('child_process');
  process.exec(shellCommand, function (error, stdout, stderr) {
    logFile('StdOut=' + stdout);
    logFile('StdErr=' + stderr);
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
  return TEMP_SOURCE_PATH + outputFile
}

function writeStringToTmpFileNeedDealPath(string, file, encoding) //'\\myOutput.txt'
{
  var outputFile = pathSeprator() + file
  var file = TEMP_SOURCE_PATH + outputFile
  fs.appendFileSync(file, string + '\n', encoding)
  return file
}

function getBaseLog(isJs) {
  var tag = isJs ? "js" : "jsx"
  var timeStr = getCurrentTime()
  var base = '[' + tag + ']' + '[' + CEP_Plugin_Version + ']' + '[' + timeStr + ']' + ">>>";
  return base
}

function logFile(logText) {
  var outputFile = LOG_PATH + pathSeprator() + currentChanegFile
  //格式
  fs.appendFileSync(outputFile, getBaseLog(true) + logText + '\n' + '\n')
}

function getCurrentTime() {
  // 获取当前时间
  var date = new Date()
  let mm = date.getMonth() + 1;
  let dd = date.getDate();
  let hh = date.getHours();
  let mf = date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
  let ss = date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
  let mss = date.getMilliseconds();    //获取当前毫秒数(0-999)
  return `${mm}-${dd} ${hh}:${mf}:${ss}:${mss}`;
}


function aePluginLog(logText) {
  //格式
  fs.appendFileSync(aePluginLogFile, '[aelog]>>>' + logText + '\n')
}



function logJSXFile(logText) {
  var outputFile = LOG_PATH + pathSeprator() + currentChanegFile
  var timeStr = getCurrentTime()
  fs.appendFileSync(outputFile, getBaseLog(false) + logText + '\n' + '\n')
}


function pathSeprator() {
  var OSVersion = csInterface.getOSInformation();
  if (OSVersion.indexOf("Windows") >= 0) {
    return "\\"
  } else {
    return "/"
  }
}

function updateProcess(progress, message = "转换中...") {
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
  writeStringToTmpFile(deflated, "myOutput_deflated.txt")

  logFile("转码前的长度：" + json.length)

  // Calling inflateSync method
  var inflated = zlib.inflateSync(Buffer.from(deflated, 'base64'));
  writeStringToTmpFile(inflated, "myOutput_inflated.txt")

  logFile("转码后的长度：" + deflated.length)

  return deflated;

}


