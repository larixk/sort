Bitmap sorter
=============

[Demo](http://larixk.nl/experiments/sort/)

What's that?
------------

Drag your images into the browser to have them processed. What happens to every image is pretty simple:

    Compare every pixel with the one below it:
        If the difference in brightness is over a threshold value:
            Swap the pixels using alpha blending
    Repeat

Uses:
-----

* HTML5 canvas
* jQuery
* dat.GUI
