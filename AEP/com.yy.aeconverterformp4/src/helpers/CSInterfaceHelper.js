
function loadJSX(fileName, cb) {


    var csInterface = new CSInterface();

    var extensionRoot = csInterface.getSystemPath(SystemPath.EXTENSION) + "/jsx/";

    // alert(extensionRoot);

    var evalS = '$.evalFile("' + extensionRoot + fileName + '")';


    csInterface.evalScript(evalS, cb);
}
