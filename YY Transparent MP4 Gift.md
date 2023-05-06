# YY transparent MP4 gift

This document is about my personal understanding of the quite mature implementation of the transparent MP4 gifts widely used in the live broadcast industry. All the content below is from my personal understanding of the entire tool chain. If you spot anything that I've misunderstood , you are most welcome to discuss about it with me in the comment area down below.


## 1.The general understanding of MP4


MP4 is an encapsulation format for streaming media. It often uses avc as the encoding method for video track, and aac as the encoding method for audio track.  The color sampling standard used by avc encoding is YUV, which is a Chroma+ Luminance color sampling format that can be converted to RGB by specific formula

```c++
 MP4 = (Video Track) + (Audio Track) + (Other Track)
```

This document here will not focus on the concept of MP4.So for more concrete details of MP4, please go google relevant documents first. When available, I will write another document to expand on it.


## 2. MP4 Gift Animation

For designers, MP4 gift animations are a what-you-see-is-what-you-get animation solution, which fully liberates designers' minds and supports all animations that designers can design, including 3D animation effects.By virtue of the high compression ratio of AVC encoding, the mobiles can relieve the CPU by fully stretching the GPU capacity while hard decoding.


## 3.transparent MP4 gift

Major live broadcast softwares had been using full-screen MP4 gift animations since last year.By analyzing the sandboxes of these apps, I found out that DouYin, YY and the other apps all use transparent MP4 effect to implement their MP4 gift animations. The solutions used by each company are similar.The only difference is   how they arrange the positions of the rgb area and alpha area.In the following content, We use AE(Adobe After Effect) as a resource export tool to give a brief introduction to the transparent MP4 solution from two aspects: resource output on the design side and rendering on the client side.

### 3.1 Effect Demonstration
  

### 3.2 Resource Output

After the designers finish designing the animation by AE, they can exported the data from rendering queue as a MP4 video like the one shown below. When the video is played in full screen on the top layer, the entire live room will be fully covered by it,terribly impacting the experience.


Using transparent MP4 effect: the data in rendering queue is exported as a MP4 video like the one shown below. Since it is transparent, it won't fully cover the content below it.Hooray!A much better experience.


The right half of the layer is created according to the left half: when the area in the left half has pixel values, an non-black area will be created in symmetrical position on the right half. Conversely, an black area will be created. While rendering a MP4 file like this, we can create a transparent effect because the right half area has actually stored the alpha channel values for the left half area.

### 3.3 MP4+Alpha Mixing Principle
 
As shown in the figure above,the number of pixels of the original resource has been doubled to the right, which is used to store the value of the alpha channel.When rendering it on the client, directly divide the R value from the right area by 255, then we will get the 0-1 alpha value. For example the first pixel, a red pixel: RGB value on the right area is (255, 0, 0) + R value on the left area is (128), mixing them will be like RGBA = (255, 0, 0, 128/255) ~= (255, 0, 0, 0.5)


### 3.4 Client Rendering

After the client get the data from the video track, it can decode the data into pictures for every frame,then mix the yuv values of both left and right sides of each frame before sending it to the buffer. Using GL formula to explain it will be:

```js
gl_FragColor = vec4( 
texture2D(texture, vec2(vUv.x/2, vUv.y)).rgb, texture2D(texture, vec2(0.5 + vUv.x/2, vUv.y)).r );
```
