from os import listdir, path
import numpy
import Image
from colormath.color_objects import LCHabColor, sRGBColor
from colormath.color_conversions import convert_color
from itertools import islice

def rgb_to_lch(h):
    rgb = sRGBColor.new_from_rgb_hex(h)
    return convert_color(rgb, LCHabColor).get_value_tuple()

def lch_to_rgb(l, c, h):
    lch = LCHabColor(l, c, h)
    return convert_color(lch, sRGBColor).get_value_tuple()

def color(val, minval, maxval):
    p = max(0, (val - minval) / (maxval - minval))
    lch = [c1 + p * (c2 - c1) for c1, c2 in zip(start_lch, end_lch)]
    rgb255 = [int(round(255 * v)) for v in lch_to_rgb(*lch)]
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
    start_lch = rgb_to_lch('#fdfaf5')
    # end_lch = rgb_to_lch('#ad4300')
    end_lch = rgb_to_lch('#993B00')
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

    minthreshold = (maxval - minval) * 0.1 + minval

    print minval, maxval

    for i, frame_arrays in enumerate(window(arrays, n=window_size)):
        if i % 2:
            continue
        frame_i = i / 2 + 1
        print 'frame', frame_i
        merged_array = merge_arrays(frame_arrays)
        img = array_to_image(merged_array, lambda x: color(x, minthreshold, maxval))
        outfilename = path.join(outdir, '%d.png' % frame_i)
        img.save(outfilename)
