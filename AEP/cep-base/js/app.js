 
/**
 * index.html对应的JS文件
 * Author:Guoyabin YY Inc
 */ 

var csInterface = new CSInterface();
var curExtensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
 
 
var CEP_Plugin_Version;
  
 

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
    
