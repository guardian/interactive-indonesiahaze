from os import listdir, path
import numpy
import ntpath
from pyhdf.SD import SD
import Image
from colorsys import hsv_to_rgb

def normalize_hsv(hsv):
    return tuple([v / c for v,c in zip(hsv, (360.0, 100.0, 100.0))])

def color(val, minval, maxval):
    normalized = (val - minval)/(maxval-minval)
    hsv = [c1 + normalized*(c2-c1) for c1, c2 in zip(hsv1, hsv2)]
    rgb255 = [int(round(255 * v)) for v in hsv_to_rgb(*hsv)]
    return tuple(rgb255)

def array_to_image(arr, color_fn):
    width = len(arr[0])
    height = len(arr)

    img = Image.new("RGB", (width, height), "white")
    for y in xrange(width):
        for x in xrange(height):
            if arr[x,y] != -9999: # -9999 is null data
                img.putpixel((y,x), color_fn(arr[x,y]))
    return img

def merge_arrays(arrays):
    # TODO: merge multiple arrays (average the non-null data across frames)
    return arrays[0]

if __name__ == "__main__":
    # output color range
    hsv1 = normalize_hsv((190, 2, 99))
    hsv2 = normalize_hsv((301, 100, 30))

    thisdir = path.dirname(path.realpath(__file__))
    indir = path.join(thisdir, '../../data/airs/')
    outdir = path.join(thisdir, '../../data/airs/frames')

    filenames = filter(lambda f: f.startswith('AIRS.2015'), listdir(indir))
    print filenames

    datasets = ['TotCO_A','TotCO_D']

    for filename in filenames:
        sd = SD(path.join(indir, filename))

        frame_arrays = [sd.select(dataset)[:] for dataset in datasets]
        merged_array = merge_arrays(frame_arrays)

        # TODO min/max needs to be across all data not per frame
        nums = filter(lambda x: x != -9999, merged_array.flatten())
        minval = min(nums)
        maxval = max(nums)

        img = array_to_image(merged_array, lambda x: color(x, minval, maxval))

        outfilename = path.join(outdir, filename[:len('AIRS.2015.11.02')])
        img.save(outfilename + '.png')
