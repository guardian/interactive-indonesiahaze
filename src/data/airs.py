from os import listdir, path
import numpy
import Image
from colorsys import hsv_to_rgb
from itertools import islice

def normalize_hsv(hsv):
    return tuple([v / c for v,c in zip(hsv, (360.0, 100.0, 100.0))])

def color(val, minval, maxval):
    normalized = (val - minval)/(maxval-minval)
    hsv = [c1 + normalized*(c2-c1) for c1, c2 in zip(hsv1, hsv2)]
    rgb255 = [int(round(255 * v)) for v in hsv_to_rgb(*hsv)]
    return tuple(rgb255)

def not_null(x):
    return x != -9999

def array_to_image(arr, color_fn):
    width = len(arr[0])
    height = len(arr)

    img = Image.new("RGB", (width, height), "white")
    for y in xrange(width):
        for x in xrange(height):
            if not_null(arr[x][y]):
                img.putpixel((y,x), color_fn(arr[x][y]))
    return img

def merge_pixels(pixels):
    data_pixels = filter(not_null, pixels)
    if len(data_pixels) == 0:
        return -9999
    return sum(data_pixels) / len(data_pixels)

def merge_arrays(arrays):
    widths = [len(arr[0]) for arr in arrays]
    heights = [len(arr) for arr in arrays]
    if any(w != widths[0] for w in widths) or any(h != heights[0] for h in heights):
        print 'Different widths/heights'
        return [[]]

    return [[merge_pixels(arr[x,y] for arr in arrays) for y in xrange(widths[0])] for x in xrange(heights[0])]

def window(seq, n=2):
    "Returns a sliding window (of width n) over data from the iterable"
    "   s -> (s0,s1,...s[n-1]), (s1,s2,...,sn), ...                   "
    it = iter(seq)
    result = tuple(islice(it, n))
    if len(result) == n:
        yield result    
    for elem in it:
        result = result[1:] + (elem,)
        yield result

if __name__ == "__main__":
    # output color range
    hsv1 = normalize_hsv((190, 2, 99))
    hsv2 = normalize_hsv((301, 100, 30))
    window_size = 6

    thisdir = path.dirname(path.realpath(__file__))
    indir = path.join(thisdir, '../../data/airs/npy')
    outdir = path.join(thisdir, '../../data/airs/frames')

    filenames = filter(lambda f: f.startswith('AIRS.2015'), listdir(indir))
    print len(filenames), 'files'

    arrays = [numpy.load(path.join(indir, filename)) for filename in sorted(filenames)]
    nums = [num for array in arrays for num in array.flatten() if not_null(num)]
    minval = min(nums)
    maxval = max(nums)

    for i, frame_arrays in enumerate(window(arrays, n=window_size)):
        if i % 2:
            continue
        frame_i = i / 2 + 1
        print 'frame', frame_i
        merged_array = merge_arrays(frame_arrays)
        img = array_to_image(merged_array, lambda x: color(x, minval, maxval))
        outfilename = path.join(outdir, '%d.png' % frame_i)
        img.save(outfilename)
