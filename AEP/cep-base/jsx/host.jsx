
 
/**
 * 获取当前所选合成的名字
 * Author:Guoyabin YY Inc
 */
 
 function getActivieItemName(){
   var activeItem = app.project.activeItem
   var name = activeItem.name
}
 
 
/**
 * 获取当前所选合成的第一个图层的名字
 * Author:Guoyabin YY Inc
 */
function getActivieLayers(){
   var activeItem = app.project.activeItem
   var layer = activeItem.layer[1]
   var layerName = layer.name
}
