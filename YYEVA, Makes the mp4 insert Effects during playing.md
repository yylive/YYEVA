# YYEVA, Makes the mp4 insert Effects during playing.

## Introduction

Normally, we need to insert some datas to mp4 in many business scenarios. Sometimes giving a reward in living room, we want to add anchor's avatar (image) and anchor's nick(text) in mp4, which can make avatar and nick play animation with the mp4 playing. At present, the more mature solutions are `SVGA`, `Lottie`, they are all satisfy the needs. However, they also do not play the complex animation like 3D effects. Moreover, we used to mp4 to play animaiton base on the mp4 small size.

Therefore, YY tried to figure out how can insert effects for meeting business needs better. After 2 months, yy had developed `YYEVA(YY Effect Video Animate)`, a tool chain consists of these parts: `Adobe After Effect`plugin, `Preview` and all platform `Render SDK`.

Before this article was published, we had use YYEVA to create some gift effects, such as commic-face... And we did it!🎉

For Designer, please read this section:[Chapter 5: YYEVA Design Specification](./YYEVA设计规范.md)

## Exploration

In the [Chapter 2: Alphe MP4](./透明MP4礼物.md), we know mp4 use the `YUV` color sampling standard, and it dost not support alpha channel. So we get inspired by the solution of alpha mp4, which create a new area to save alpha channel data of resouce. We create area further to save our **image** type data and **text** type data.

Here some questions:

* what's the type of element?
* what's the shapre of element?
* what's the postion of element?

Due to designers create some resources, they also need to specify the key infomation of element: **type**, **shape**, **position**.

How can we do something to help designers? We made a long time to research, and finally determined to make a `Adobe Effect After` plugin can parse resource and save the key infomation. After transmit this data to the client, the client will take it to revert all process of animation.

In the [Chapter 3: Application Of The Matrix Transformation](./变换矩阵在动画上一些应用.md), we know that animation is essentially left multiplying an affine matrix by the pixels,  and return the new positon to us. If we can get the matrix transformation by `Adobe After Effect`'s api, and contruct a relative affine matrix. Finally, we can get the position of each frame of the layer. In fact, we follow this idea to complete the entire YYEVA solution.

## Details

### Parts Of `Adobe Effect After` plugin:

***This plugin is made for helping designers to produce mix-mp4 file***

This is the main interface:

![img](./img/yyeva_ae_plugin_main.png)

Among four tabs:

* First Tab: Expand the ability of output the 264/265 mp4, which there is no it before.
* Second Tab: Parse the layer to get some key infomations, finally output a mix-mp4.
* Third Tab: Log the key path of process so that developer can find out the error reason soon.
* Final Tab: Preview the mix-mp4.

#### 1.	Make mix-mp4

Use AE to produce the mix-mp4, designer needs to conform [Chapter 5: YYEVA Design Specification](./YYEVA设计规范.md)

#### 2.	Preparations before conversion

Before conversion, plugin will check validity of the seleted layer. Here are the main check steps:

*	Check if the seleted comp contains an alpha area layer, because the plugin is working base on the alpha mp4. So we need to confirm the mp4 has alpha area layer.
* 	Check if the compostion selected contains the `Mask` area. Detail in [Chapter 5: YYEVA Design Specification](./YYEVA设计规范.md).
	*  The text mask area uses text_image as the composition name.
	*  The image mask area uses mask_image as the composition name.
	*  If neither is contained, the plug-in considers that no conversion to mixed MP4 is necessary.
*	Check whether AE contains the `YYConverterMP4` template. If not, please refer to the `YYEVA` Plug-in Design Specification for template configuration[Chapter 5: YYEVA Plugin Install](./YYEVA/工具安装和环境搭建.md). This step is to expand the ability of AE to convert MP4 and perform some related configuration of the rendering queue.


#### 3. Analyze and process the designer's layer data

After passing the legality verification, the plugin starts parsing the composition specified by the designer.

*	Traverse the compositions of the project, extract mask_text and mask_image, and type them: picture and text.
* 	Traverse all valid layers in the two major types of pictures and text respectively, and get the affine matrix of each layer in each frame.(matrix).
*  According to the affine matrix obtained in step 2, the position of each layer in each frame on the canvas can be confirmed.(renderFrame).

```js
The specific calculation method is as follows: (Take a picture layer as an example)

1. Get size of the content in picture AVLayer: layer.width, layer.height

2. Use the size to consturct 4 vertices: 
    leftTop:[0,0,1]  
    leftBottom:[0,height,1] 
    rightTop:[width,0,1] 
    rightBottom:[width,height,1]

3. Traverse the matrix of each frame of AVLayer and multiply by the 4 vertices (x1, y1), (x2, y2), (x3, y3), (x4, y4) constructed above. Then we get new 4 vertices (a1, b1), (a2, b2), (a3, b3), (a4, b4), become the layer vertices after the transformation in this frame.

4  Calculate the maximum matrix area formed by the new four vertices, and generate new four vertices (a4,b1) , (a2,b1) , (a2,b3) , (a4,b3).

5  According to the four vertices of step3 and step4, calculate a new `frame` and save it as the `layer` in the frame `frame`: [a4 , b1 , a2 – a4 , b3 - b1]

```

***Detail of step 4 caculation:***

![img](./img/ae_calculator_frame.png)

***The above steps can get the data of first key renderFrame , that is to say, the position data of the mask of each frame on the screen***


* Copy the selected composition for output composition when adding to the render queue, preventing operation on the original composition.
* For the output composition after copying, reduce the alpha area by 0.5 times and divide it into three areas: area 1, area 2, area 3

```js
For example 1800 * 1000 video

 -   orginal composition
     -  area1. left 900 * 1000 save rgb
     -  area2. right 900 * 1000 save alpha

 -   输出合成
     -   area1. left 900 * 1000 save rgb
     -   area2. right 900 * 500 save alpha
     -   area3. right 900 * 500 save mask
```

![img](./img/ae_output_descript.png)


* Copy all active mask compositions to area 3 of the output composition of step 4
* This step will copy all the layers under the image mask and text mask to the area3 of output composition, then dynamically adjust the size and position of all layers, and save the size and position in `outputFrame` for later getting the shape of these masks through `outputFrame`.
* Save the accommodating width and height of area 3, which is used to judge whether it is enough to accommodate the copied layer.
* Get the renderFrame which be caculated of the current copied layer.
* Compute the affine matrix transformed from the current mask layer's position to the new beginX and beginY positions.
* Apply the affine matrix calculated in the previous step to the position of the mask layer.
* Record the position of mask layer, which caculated after copy. We call it `mask_Frame`.
* Update the `beginX`, `beginY`, `maxWidth` and `maxHeight`.

***After applying the above operations for each `Mask` layer, we can get another key data `outputFrame`,which is the position data of each frame of `Mask` on the output***

#### 4.	Generate mixed `MP4` assets

Accroding to step3, we can get the following data through the layer analysis:

*	The position of `Mask` each frame on screen. We call it `renderFrame`.
* 	Copy the position of `Mask` each frame to the copied composition. We call it `outputFrame`.
*  Put `renderFrame` and `outputFrame` into `Json`.
*  Add copied composition to the render queue by `YYConvertMP4` which created in `Adobe After Effect` templage setting.
*  Convert to `MP4` from `AVI` output which rendered from render queue by `H264/H265` tab ability.
*  Use `zlib` zip the data from step 3, and encoded with `base64`, and save it.
*  Encapsulate the generated `base64` data into the following format： `yyeffectmp4json[[base64]]yyeffectmp4json`
	*	 Since H5 does not embed the `ffmpeg` library, the way H5 extracts the `Metadata` segment depends on regular matching, so our `Metadata` data format will be prefixed and suffixed with `yyeffectmp4json[[base64]]yyeffectmp4json`, which is convenient `H5` quickly locates the data in the `Metadata` section.

```js
 var templateStart = "yyeffectmp4json[["
 var templateEnd = "]]yyeffectmp4json"
 base64 =  templateStart + base64 + templateEnd
```

### Client

After the client gets the `mixed MP4` resource, it needs to extract the written `base64`, decompress the data, and combine the decoded data of each frame to complete the final rendering work.

#### 1.	Extract `Json` data

Use ffmpeg SDK or regular expression to extract the `base64` data stored in `Metadata` from MP4, remove the prefix and suffix and unpack it with `zlib` to get the real `Json` data.

#### 2.	Get decoded rendered frame

After hard decoding the `Video Track` of `MP4`, get the `pixelBuffer` of each frame.

#### 3.	According to the Json data and rendering frame data, combined with the business data, the rendering operation is completed.

![img](./img/render_mobile.png)

## Performance

![img](./img/cpugpuforios.png)

## Json struct

[Json struct](./数据结构.md) 




