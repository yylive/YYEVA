# Applications of transformation matrices in animation

## Introduction
 
As we all know, the screen is made up of pixels. The essence of animation is to translate, rotate, zoom and execute other operations on the pixels in the element. To describe these operations in a mathematical form which can be restored by the computers, we should use transformation matrix.In this document,we will use some mathematical formulas to understand how to describe the animation process by using the transformation matrix. Let's take a two-dimensional plane as an example to expand the discussion.**


## 1. Homogeneous Coordinates

In the filed of homogeneous coordinates, there is an exact conclusion , in the two-dimensional plane:

```js
    point :   Use (x, y, 1) to represent a fixed coordinate point in the coordinate system
    vector:   Use (x, y, 0) to represent a directed line segment in the coordinate system
``` 

The difference exists in the third components which are 1 and 0 respectively.Point focus on position and Vector focus on the direction.


## 2.Matrix Multiplication

 The prerequisite for 2 matrices to be multiplied is: The columns of the previous matrix must be equal to the rows of the latter matrix. And the result of the multiplication will be: the rows of the previous matrix multiply by the columns of the next matrix.

```js
n x m * m x k = n x k
```


## 3.Matrix Operations

### 3.1 Translation

Assume there is a point(x,y,1）, as we all know, if a point is translated 3 units on the x-axis and 4 units on the y-axis, the result after translations is (x+3,y+4,1). We use the column vector to represent the point . By multiplying the above matrices, we know that we need to construct a 3x3 matrix and left-multiply the column vector to get a new 3x1 column vector. So the formula is as follows

```c++
  a b c              x                 x+3
( d e f )   *      ( y  )     =      ( y+4 )
  g h i              1                  1
  
So:

 ax + by + c  = x + 3
 
 dx + ey + f  = y + 4
 
 gx + hy + i  = 1  
 
Result:

a = 1   b = 0  c = 3 

d = 0   e = 1  f = 4

g = 0   h = 0  i = 1


So the resulting Maxtrix is    

   1  0  3                                  1  0  dx
(  0  1  4 )  ===translating matrix===>  (  0  1  dy )
   0  0  1                                  0  0  1

```

As you can see, To translating dx, dy  on a pixel， We can construct a matrix like the one shown above and left-multiply it by the vector



### 3.2 scaling

Consider a point (x, y, 1), we know that if a point is scaled 3 times on the x-axis and 4 times on the y-axis, the result after scaling is (3x, 4y, 1). Similarly, if we need to construct a 3x3 matrix, and left-multiplying the column vector to get the new result
That formula is as follows


```c++
  a b c              x                  3x 
( d e f )   *      ( y  )     =      (  4y )
  g h i              1                  1
  
So:

 ax + by + c  = 3x
 
 dx + ey + f  = 4y
 
 gx + hy + i  = 1  
 
Result: 

a = 3   b = 0  c = 1

d = 0   e = 4  f = 0

g = 0   h = 0  i = 1


Resulting Matrix:    

   3  0  0                              a  0  0
(  0  4  0 )  ===scaling matrix===>  (  0  b  0 )
   0  0  1                              0  0  1

  
```
 
### 3.3 Rotation

Consider a point (x, y, 1), as we know, if we rotate b degrees around the point, the result will be shown by the picture below

```c++

before rotation

 x1 = r*cosa
 y1 = r*sina

after rotation

 x2 = r*cos(a+b) = r*cosa*cosb - r*sina*sinb = x1*cosb - y1*sinb
 y2 = r*sin(a+b) = r*sina*cosb + rcosa*sinb  = y1*cosb + x1*sinb
 
  a b c              x1                  x2 
( d e f )   *      ( y1  )     =      (  y2 )
  g h i              1                    1
  
 a * x1 + b * y1 + c = x2
 d * x1 + e * y1 + f = y2
 g * x1 + h * y1 + i = 1
  
 result
 
 a=cosb  b=-sinb c=0
 
 d=sinb  e=cosb  f=0
 
 g=0     h=0     i= 1

so the resulting matrix is (b is the rotation degree)
 
   cosb -sinb 0
 ( sinb cosb 0 )     
   0     0   1
```

## 4. Affine Transformation

Affine transformation is a combination of using the above matrix transformation as a mathematical expression which can be used to left-multiply the point column vector to represent the transformation of the pixel point.
Note: Left multiplication is generally first scaling, rotating transformation, and then doing translation transformation, for example.

```c++
  
    Pixel point(3,4,1) -》translated by one unit in the positive direction on the x-axis, and translated by 2 units in the positive direction on the y-axis -》magnified by 2 times on the x-axis, and magnified by 2 times on the y-axis
    

   1.translate first, then transform
   
     2,0,0      1,0,2      3          10
   ( 0,2,0 ) * (0,1,2) * ( 4 )  =   ( 12 )  
     0,0,1      0,0,1      1          1
     

     It can be seen from the result that the value of the translation is also magnified by 2 times


   2.scale first, then translate
   
     1,0,2      2,0,0      3          8
   ( 0,1,2 ) * (0,2,0) * ( 4 )  =   ( 10 )  
     0,0,1      0,0,1      1          1
     

     It can be seen from the result that   we have the tranlation value as expected.
```


so transformation matrix is expressed as follows

```c++
                     a 0 dx
rotated matrix =   ( 0 b dy )
                     0 0 1

```

a and b together affect the rotation and scaling, dx, dy affect the displacement**
