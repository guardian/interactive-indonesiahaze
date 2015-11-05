from os import listdir, path
from pyhdf.SD import SD
import numpy

thisdir = path.dirname(path.realpath(__file__))
indir = path.join(thisdir, '../../data/airs/')
outdir = path.join(thisdir, '../../data/airs/npy')

filenames = filter(lambda f: f.startswith('AIRS.2015'), listdir(indir))
print filenames

datasets = ['TotCO_A','TotCO_D']

for filename in filenames:
    sd = SD(path.join(indir, filename))

    for dataset in datasets:
        outfilename = path.join(outdir, '%s-%s.npy' % (filename[:len('AIRS.0000.00.00')], dataset))
        frame = sd.select(dataset)[:]
        numpy.save(outfilename, frame)
