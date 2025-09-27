// chordLibrary.js
const chordLibrary = [
  { chordType: 'maj7',    label: 'maj7',    intervals: [0,4,7,11], fullName: 'Major Seventh',           altLabel: ['M7','maj7','△7','△'],    intervalsNames: ['P1','M3','P5','M7'] },
  { chordType: 'min7',    label: 'min7',    intervals: [0,3,7,10], fullName: 'Minor Seventh',           altLabel: ['m7','-7','min7'],         intervalsNames: ['P1','m3','P5','m7'] },
  { chordType: 'dom7',    label: '7',       intervals: [0,4,7,10], fullName: 'Dominant Seventh',        altLabel: ['7','dom7'],               intervalsNames: ['P1','M3','P5','m7'] },
  { chordType: 'm7b5',    label: 'm7b5',    intervals: [0,3,6,10], fullName: 'Half Diminished Seventh', altLabel: ['ø7','m7b5','half-dim'],    intervalsNames: ['P1','m3','d5','m7'] },
  { chordType: 'dim7',    label: 'dim7',    intervals: [0,3,6,9],  fullName: 'Diminished Seventh',      altLabel: ['°7','dim7'],              intervalsNames: ['P1','m3','d5','d7'] },
  { chordType: 'dim',     label: 'dim',     intervals: [0,3,6],    fullName: 'Diminished',              altLabel: ['°','dim'],                 intervalsNames: ['P1','m3','d5'] },
  { chordType: 'minMaj7', label: 'minMaj7', intervals: [0,3,7,11], fullName: 'Minor Major Seventh',     altLabel: ['mM7','m△7','mMaj7'],      intervalsNames: ['P1','m3','P5','M7'] },
  { chordType: 'maj',     label: '',     intervals: [0,4,7],    fullName: 'Major',                   altLabel: ['M','maj'],                 intervalsNames: ['P1','M3','P5'] },
  { chordType: 'min',     label: 'min',     intervals: [0,3,7],    fullName: 'Minor',                   altLabel: ['m','-','min'],             intervalsNames: ['P1','m3','P5'] },
  { chordType: 'sus2',    label: 'sus2',    intervals: [0,2,7],    fullName: 'Suspended Second',        altLabel: ['sus2'],                    intervalsNames: ['P1','M2','P5'] },
  { chordType: 'sus4',    label: 'sus4',    intervals: [0,5,7],    fullName: 'Suspended Fourth',        altLabel: ['sus4','sus'],              intervalsNames: ['P1','P4','P5'] },
  { chordType: 'aug',     label: 'aug',     intervals: [0,4,8],    fullName: 'Augmented',               altLabel: ['+','aug'],                 intervalsNames: ['P1','M3','A5'] }
];


const extSignatures = {
  maj: [
    {
      chordType: 'maj',
      label: '6/9',
      intervals: [0,4,7,9,14],
      info: '',
      intervalsNames: ['P1','M3','P5','M6','M9'],
      fullName: 'Major Sixth and Ninth',
      altLabel: ['6/9','6/9']
    },
    {
      chordType: 'maj',
      label: 'add9',
      intervals: [0,4,7,14],
      info: '',
      intervalsNames: ['P1','M3','P5','M9'],
      fullName: 'Add Ninth',
      altLabel: ['add9','add 9']
    },
    {
      chordType: 'maj',
      label: '6',
      intervals: [0,4,7,9],
      info: '',
      intervalsNames: ['P1','M3','P5','M6'],
      fullName: 'Major Sixth',
      altLabel: ['6','6']
    }
  ],

  maj7: [
    {
      chordType: 'maj7',
      label: 'maj13',
      intervals: [0,4,7,11,14,17,21],
      info: '',
      intervalsNames: ['P1','M3','P5','M7','M9','P11','M13'],
      fullName: 'Major Thirteenth',
      altLabel: ['maj13','M13','△13']
    },
    {
      chordType: 'maj7',
      label: 'maj13',
      intervals: [0,4,7,11,14,21],
      info: 'no11',
      intervalsNames: ['P1','M3','P5','M7','M9','M13'],
      fullName: 'Major Thirteenth (no 11)',
      altLabel: ['maj13','M13']
    },
    {
      chordType: 'maj7',
      label: 'maj13',
      intervals: [0,4,7,11,21],
      info: 'no9,no11',
      intervalsNames: ['P1','M3','P5','M7','M13'],
      fullName: 'Major Thirteenth (no 9, no 11)',
      altLabel: ['maj13','M13']
    },
    {
      chordType: 'maj7',
      label: 'maj11',
      intervals: [0,4,7,11,14,17],
      info: '',
      intervalsNames: ['P1','M3','P5','M7','M9','P11'],
      fullName: 'Major Eleventh',
      altLabel: ['maj11','M11','△11']
    },
    {
      chordType: 'maj7',
      label: 'maj11',
      intervals: [0,4,7,11,17],
      info: 'no9',
      intervalsNames: ['P1','M3','P5','M7','P11'],
      fullName: 'Major Eleventh (no 9)',
      altLabel: ['maj11','M11']
    },
    {
      chordType: 'maj7',
      label: 'maj9',
      intervals: [0,4,7,11,14],
      info: '',
      intervalsNames: ['P1','M3','P5','M7','M9'],
      fullName: 'Major Ninth',
      altLabel: ['maj9','M9','△9']
    }
  ],

  dom7: [
    {
      chordType: 'dom7',
      label: '13',
      intervals: [0,4,7,10,14,17,21],
      info: '',
      intervalsNames: ['P1','M3','P5','m7','M9','P11','M13'],
      fullName: 'Dominant Thirteenth',
      altLabel: ['13','13']
    },
    {
      chordType: 'dom7',
      label: '13',
      intervals: [0,4,7,10,14,21],
      info: 'no11',
      intervalsNames: ['P1','M3','P5','m7','M9','M13'],
      fullName: 'Dominant Thirteenth (no 11)',
      altLabel: ['13','13']
    },
    {
      chordType: 'dom7',
      label: '13',
      intervals: [0,4,7,10,21],
      info: 'no9,no11',
      intervalsNames: ['P1','M3','P5','m7','M13'],
      fullName: 'Dominant Thirteenth (no 9, no 11)',
      altLabel: ['13','13']
    },
    {
      chordType: 'dom7',
      label: '11',
      intervals: [0,4,7,10,14,17],
      info: '',
      intervalsNames: ['P1','M3','P5','m7','M9','P11'],
      fullName: 'Dominant Eleventh',
      altLabel: ['11','11']
    },
    {
      chordType: 'dom7',
      label: '11',
      intervals: [0,4,7,10,17],
      info: 'no9',
      intervalsNames: ['P1','M3','P5','m7','P11'],
      fullName: 'Dominant Eleventh (no 9)',
      altLabel: ['11','11']
    },
    {
      chordType: 'dom7',
      label: '9',
      intervals: [0,4,7,10,14],
      info: '',
      intervalsNames: ['P1','M3','P5','m7','M9'],
      fullName: 'Dominant Ninth',
      altLabel: ['9','9']
    }
  ],

  min: [
    {
      chordType: 'min',
      label: 'm6/9',
      intervals: [0,3,7,9,14],
      info: '',
      intervalsNames: ['P1','m3','P5','M6','M9'],
      fullName: 'Minor Sixth and Ninth',
      altLabel: ['m6/9','m6-9']
    },
    {
      chordType: 'min',
      label: 'm6',
      intervals: [0,3,7,9],
      info: 'no9',
      intervalsNames: ['P1','m3','P5','M6'],
      fullName: 'Minor Sixth',
      altLabel: ['m6','m6']
    }
  ],

  min7: [
    {
      chordType: 'min7',
      label: 'm13',
      intervals: [0,3,7,10,14,17,21],
      info: '',
      intervalsNames: ['P1','m3','P5','m7','M9','P11','M13'],
      fullName: 'Minor Thirteenth',
      altLabel: ['m13','m13']
    },
    {
      chordType: 'min7',
      label: 'm13',
      intervals: [0,3,7,10,14,21],
      info: 'no11',
      intervalsNames: ['P1','m3','P5','m7','M9','M13'],
      fullName: 'Minor Thirteenth (no 11)',
      altLabel: ['m13','m13']
    },
    {
      chordType: 'min7',
      label: 'm13',
      intervals: [0,3,7,10,21],
      info: 'no9,no11',
      intervalsNames: ['P1','m3','P5','m7','M13'],
      fullName: 'Minor Thirteenth (no 9, no 11)',
      altLabel: ['m13','m13']
    },
    {
      chordType: 'min7',
      label: 'm11',
      intervals: [0,3,7,10,14,17],
      info: '',
      intervalsNames: ['P1','m3','P5','m7','M9','P11'],
      fullName: 'Minor Eleventh',
      altLabel: ['m11','m11']
    },
    {
      chordType: 'min7',
      label: 'm11',
      intervals: [0,3,7,10,17],
      info: 'no9',
      intervalsNames: ['P1','m3','P5','m7','P11'],
      fullName: 'Minor Eleventh (no 9)',
      altLabel: ['m11','m11']
    },
    {
      chordType: 'min7',
      label: 'm9',
      intervals: [0,3,7,10,14],
      info: '',
      intervalsNames: ['P1','m3','P5','m7','M9'],
      fullName: 'Minor Ninth',
      altLabel: ['m9','m9']
    }
  ]
};

