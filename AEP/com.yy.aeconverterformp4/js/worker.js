(function () {
    const { workerData, parentPort } = require('worker_threads')
    const { progress, TEMP_SOURCE_PATH, osVersion } = workerData
    function changePathToPlatform(path) {
        if (osVersion == OS_VERSION_WINDOWS) {
            path = path.split("\\").join("\\\\");
        }
        return path;
    }
    function zlibJson(json) {

        if (json == undefined) {
            return
        }
        var zlib = require('zlib');
        var Buffer = require('buffer').Buffer

        // Calling deflateSync method
        var deflated = zlib.deflateSync(json).toString('base64');
        // writeStringToTmpFile(deflated, "myOutput_deflated.txt")
        parentPort.postMessage({ type: 'writeStringToTmpFile', data: deflated, filename: 'myOutput_deflated.txt' })
        // logFile("转码前的长度：" + json.length)

        // Calling inflateSync method
        var inflated = zlib.inflateSync(Buffer.from(deflated, 'base64'));
        // writeStringToTmpFile(inflated, "myOutput_inflated.txt")
        parentPort.postMessage({ type: 'writeStringToTmpFile', data: inflated, filename: 'myOutput_inflated.txt' })

        // logFile("转码后的长度：" + deflated.length)

        return deflated;

    }
    function main() {

        csInterface.evalScript("beginConverter('" + TEMP_SOURCE_PATH + "')", function (res) {

            if (res == undefined) {
                return
            }

            res = JSON.parse(res)
            var mode = res["mode"]
            var data = res["data"]

            var pathObj = mode == 1 ? replaceSuffix(outputPath, "normal") : replaceSuffix(outputPath, "dynamic")
            var outFile_264 = pathObj.path_264;
            var outFile_265 = pathObj.path_265;

            var tempPathObj = replaceSuffix(outputTempPath)
            var outputTempPath_264 = tempPathObj.path_264;
            var outputTempPath_265 = tempPathObj.path_265;

            var successMsg = "mp4转换成功"

            // logFile('创建临时文件成功  \n 264输出临时路径' + outputTempPath_264 + '\n 265输出临时路径' + outputTempPath_265)

            var jsonStr = data
            // progress = 0.5
            // updateProcess(progress, "AE工程解析完成")
            parentPort.postMessage({ progress: 0.5, message: 'AE工程解析完成' })
            if (jsonStr == 'undefined' || jsonStr == "") {
                // logFile('json is undefined');
                // showModalTip(false)
                parentPort.postMessage({ type: 'showModalTip', data: false })
                return
            }
            var result = JSON.parse(jsonStr)
            var movFile = result["file"]
            var evaJson = result["evaJson"]
            movFile = changePathToPlatform(movFile)
            // writeStringToTmpFile(evaJson, 'myOutput.txt');
            parentPort.postMessage({ type: 'writeStringToTmpFile', data: evaJson, filename: 'myOutput.txt' })

            // deleteFile(outputTempPath_264)
            parentPort.postMessage({ type: 'deleteFile', data: outputTempPath_264 })
            // deleteFile(outputTempPath_265)
            parentPort.postMessage({ type: 'deleteFile', data: outputTempPath_265 })

            // deleteFile(outFile_264)
            parentPort.postMessage({ type: 'deleteFile', data: outFile_264 })
            // deleteFile(outFile_265)
            parentPort.postMessage({ type: 'deleteFile', data: outFile_265 })

            evaJson = zlibJson(evaJson)

            let success264 = false;
            let success265 = false;

            progress = 0.7;
            // updateProcess(progress, "Json数据压缩完成");
            parentPort.postMessage({ progress: progress, message: 'Json数据压缩完成' })
            if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
                // logFile('当前写入的类型是METADATA');
            }

            convertAviToMP4(movFile, outputTempPath_264, encodeLevel, MP4EnCodeType.avc, function () {
                if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
                    // alertMessage("当前写入的类型是METADATA")
                    // writeJsonToMp4MetaData(outputTempPath_264, outFile_264, evaJson);
                    parentPort.postMessage({ type: 'writeJsonToMp4MetaData', path: outputTempPath_264, file: outFile_264, data: evaJson })
                }

                success264 = true
                // logFile('完成转换264' + "success265 :" + success265 + "success264" + success264);

                // progress += 0.1;
                // updateProcess(progress, "h264的metadata数据已写入");
                parentPort.postMessage({ progress: progress + 0.1, message: 'h264的metadata数据已写入' })
                if (success264 && success265) {
                    // progress = 1;
                    // updateProcess(progress);
                    parentPort.postMessage({ progress: 1, message: 'h264的metadata数据已写入' })
                    setTimeout(() => {
                        // showModalTip(false)
                        parentPort.postMessage({ type: 'showModalTip', data: false })
                        // alertMessage(successMsg)
                        parentPort.postMessage({ type: 'alertMessage', data: successMsg })
                    }, 250);
                    // logFile('全部完成转换');
                }
            });

            convertAviToMP4(movFile, outputTempPath_265, encodeLevel, MP4EnCodeType.hevc, function () {
                if (YYEVA_CUR_WRITE_STYLE == YYEVA_WRITE_STYLE_METADATA) {
                    // alertMessage("当前写入的类型是METADATA")
                    // writeJsonToMp4MetaData(outputTempPath_265, outFile_265, evaJson);
                    parentPort.postMessage({ type: 'writeJsonToMp4MetaData', path: outputTempPath_265, file: outFile_265, data: evaJson })
                }
                success265 = true
                // logFile('完成转换265' + "success265 :" + success265 + "success264" + success264);

                // progress += 0.1;
                // updateProcess(progress, "h265的metadata数据已写入");
                parentPort.postMessage({ progress: progress + 0.1, message: 'h265的metadata数据已写入' })
                if (success264 && success265) {
                    // progress = 1;
                    // updateProcess(progress);
                    parentPort.postMessage({ progress: 1, message: 'h265的metadata数据已写入' })
                    setTimeout(() => {
                        // showModalTip(false)
                        parentPort.postMessage({ type: 'showModalTip', data: false })
                        // alertMessage(successMsg)
                        parentPort.postMessage({ type: 'alertMessage', data: successMsg })
                    }, 250);
                    // logFile('全部完成转换');
                }
            });
        });
    }

    main()
})()

