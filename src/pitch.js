import React, {Component} from 'react';
import * as Tone from "tone";
import './pithc.css';

class SoundDetector extends Component {
    constructor(props) {
        super(props);
        const buflen = 2048;
        this.changeNoteInState = this.changeNoteInState.bind(this)
        this.updatePitch = this.updatePitch.bind(this)
        this.state = {
            audioContext: null,
            mediaStream: null,
            source: null,
            analyser: null,
            currentNote: '',
            pendingNote: '',
            MAX_SIZE: null,
            rafID: null,
            isRecording: false,
            buf: new Float32Array(buflen),
            noteFrequencies: [
                // {name: 'C-3', frequency: 130.81, index: 48},
                // {name: 'C♯/D♭-3', frequency: 138.59, index: 49},
                // {name: 'D-3', frequency: 146.83, index: 50},
                // {name: 'D♯/E♭-3', frequency: 155.56, index: 51},
                // {name: 'E-3', frequency: 164.81, index: 52},
                // {name: 'F-3', frequency: 174.61, index: 53},
                // {name: 'F♯/G♭-3', frequency: 185.00, index: 54},
                // {name: 'G-3', frequency: 196.00, index: 55},
                // {name: 'G♯/A♭-3', frequency: 207.65, index: 56},
                // {name: 'A-3', frequency: 220.00, index: 57},
                // {name: 'A♯/B♭-3', frequency: 233.08, index: 58},
                // {name: 'B-3', frequency: 246.94, index: 59},
                // {name: 'C-4', frequency: 261.63, index: 60},
                // {name: 'C♯/D♭-4', frequency: 277.18, index: 61},
                // {name: 'D-4', frequency: 293.66, index: 62},
                // {name: 'D♯/E♭-4', frequency: 311.13, index: 63},
                // {name: 'E-4', frequency: 329.63, index: 64},
                // {name: 'F-4', frequency: 349.23, index: 65},
                // {name: 'F♯/G♭-4', frequency: 369.99, index: 66},
                // {name: 'G-4', frequency: 392.00, index: 67},
                // {name: 'G♯/A♭-4', frequency: 415.30, index: 68},
                // {name: 'A-4', frequency: 440.00, index: 69},
                // {name: 'A♯/B♭-4', frequency: 466.16, index: 70},
                // {name: 'B-4', frequency: 493.88, index: 71},
                {name: 'C-5', frequency: 523.25, index: 72},
                {name: 'C♯/D♭-5', frequency: 554.37, index: 73},
                {name: 'D-5', frequency: 587.33, index: 74},
                {name: 'D♯/E♭-5', frequency: 622.25, index: 75},
                {name: 'E-5', frequency: 659.25, index: 76},
                {name: 'F-5', frequency: 698.46, index: 77},
                {name: 'F♯/G♭-5', frequency: 739.99, index: 78},
                {name: 'G-5', frequency: 783.99, index: 79},
                {name: 'G♯/A♭-5', frequency: 830.61, index: 80},
                {name: 'A-5', frequency: 880.00, index: 81},
                {name: 'A♯/B♭-5', frequency: 932.33, index: 82},
                {name: 'B-5', frequency: 987.77, index: 83},
                {name: 'C-6', frequency: 1046.50, index: 84},
                {name: 'C♯/D♭-6', frequency: 1108.73, index: 85},
                {name: 'D-6', frequency: 1174.66, index: 86},
                {name: 'D♯/E♭-6', frequency: 1244.51, index: 87},
                {name: 'E-6', frequency: 1318.51, index: 88},
                {name: 'F-6', frequency: 1396.91, index: 89},
            ],
            notesPlayed: [],
            notesToMimic: ["C-5", "D-5", "E-5", "D-5"],
            slidingWindow:["@","#","$","%"]
        };


    }

    componentWillUnmount() {
        this.stopListening();
    }

    startListening = () => {

        const rafID = setInterval( this.updatePitch, 150);

        // Get audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.setState({
            audioContext,
            MAX_SIZE: Math.max(4, Math.floor(audioContext.sampleRate / 5000)),	// corresponds to a 5kHz signal
            rafID,
            notesPlayed: [],
            currentNote: '',
            slidingWindow: ["@","#","$","%"],
            isRecording: true
        })

        // Get media stream
        navigator.mediaDevices.getUserMedia({audio: true, video: false})
            .then((mediaStream) => {
                // Create source from media stream
                const source = audioContext.createMediaStreamSource(mediaStream);
                // Create analyser
                const analyser = audioContext.createAnalyser();
                this.setState({source,mediaStream,analyser});
                source.connect(analyser);
            })
            .catch(console.error);
    };

    generateSequence = () => {
        const {noteFrequencies} = this.state
        let maxDistance =4
        let length = 3

        let notes = [];
        let lastNoteIndex = Math.floor(Math.random() * 12); // Randomly select first note index within one octave
        let lastNote = notes[lastNoteIndex];
        while (notes.length < length) {
            let noteIndex = Math.floor(Math.random() * 12); // Randomly select a note index within one octave
            let note = Object.assign({}, noteFrequencies[noteIndex]); // Copy the note object from the provided note list
            if (lastNote && Math.abs(note.index - lastNote.index) > maxDistance) {
                continue; // Skip this note if the distance between it and the previous note is too large
            }
            if (notes.some(n => n.name === note.name)) {
                continue; // Skip this note if it has already been used in the sequence
            }
            notes.push(note);
            lastNoteIndex = noteIndex;
            lastNote = note;
        }
        this.setState({notesToMimic: notes.map(n => n.name)}) ;
    }

    getStepsBetweenKeys = (key1, key2) => {
        const keys = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
        const key1Note = key1.slice(0, -1);
        const key1Octave = parseInt(key1.slice(-1));
        const key1Index = keys.indexOf(key1Note);

        const key2Note = key2.slice(0, -1);
        const key2Octave = parseInt(key2.slice(-1));
        const key2Index = keys.indexOf(key2Note);

        const key1MidiNote = (key1Octave + 1) * 12 + key1Index;
        const key2MidiNote = (key2Octave + 1) * 12 + key2Index;

        return key1MidiNote - key2MidiNote;
    }

    playNotes = () => {
        let {notesToMimic}  = this.state

        for (let i = 0; i < notesToMimic.length; i++) {
            notesToMimic[i] = notesToMimic[i].replace('-', ''); // remove '-'
            notesToMimic[i] = notesToMimic[i].replace('♯', '#'); // replace '♯' with '#'
            notesToMimic[i] = notesToMimic[i].replace('♭', 'b'); // replace '♭' with 'b'
            notesToMimic[i] = notesToMimic[i].replace('/', notesToMimic[i].charAt(notesToMimic[i].length - 1) + '/' ); // add octave number
        }

        this.stopListening()

        const synth = new Tone.Synth().toDestination();
        const duration = "2n";
        let index = 0;

        const playNextNote = () => {
            if (index < notesToMimic.length) {
                synth.triggerAttackRelease(notesToMimic[index], duration);
                index++;
                Tone.Transport.scheduleOnce(playNextNote, `+${duration}`);
            } else {
                Tone.Transport.stop();
                this.startListening()
            }
        };

        Tone.Transport.scheduleOnce(playNextNote, `+${duration}`);
        Tone.Transport.start();

    }

    stopListening = () => {
        const {mediaStream, rafID} = this.state;
        clearInterval(rafID)
        if (!mediaStream) return
        mediaStream.getTracks().forEach((track) => {
            track.stop();
        });
        this.setState({isRecording:false})
    };

    autoCorrelate(buf, sampleRate) {
        // Implements the ACF2+ algorithm
        let SIZE = buf.length;
        let rms = 0;

        for (let i = 0; i < SIZE; i++) {
            const val = buf[i];
            rms += val * val;
        }
        rms = Math.sqrt(rms / SIZE);
        if (rms < 0.01) // not enough signal
            return -1;

        let r1 = 0, r2 = SIZE - 1;
        const thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++)
            if (Math.abs(buf[i]) < thres) {
                r1 = i;
                break;
            }
        for (let i = 1; i < SIZE / 2; i++)
            if (Math.abs(buf[SIZE - i]) < thres) {
                r2 = SIZE - i;
                break;
            }

        buf = buf.slice(r1, r2);
        SIZE = buf.length;

        const c = new Array(SIZE).fill(0);
        for (let i = 0; i < SIZE; i++)
            for (let j = 0; j < SIZE - i; j++)
                c[i] = c[i] + buf[j] * buf[j + i];

        let d = 0;
        while (c[d] > c[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
            if (c[i] > maxval) {
                maxval = c[i];
                maxpos = i;
            }
        }
        let T0 = maxpos;

        const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
        let a = (x1 + x3 - 2 * x2) / 2;
        let b = (x3 - x1) / 2;
        if (a) T0 = T0 - b / (2 * a);

        return sampleRate / T0;
    }

    noteFromPitch(frequency) {
        const noteNum = 12 * (Math.log(frequency / 440) / Math.log(2));
        return Math.round(noteNum) + 69;
    }

    updatePitch = () =>  {
        const {analyser, buf, audioContext, noteFrequencies} = this.state;
        let cycles = [];

        if (!analyser) return;
        analyser.getFloatTimeDomainData(buf);

        let pitch = this.autoCorrelate(buf, audioContext.sampleRate);
        // TODO: Paint confidence meter on canvasElem here.

        let newNote, noteName
        if (pitch !== -1) {
            newNote = this.noteFromPitch(pitch);
            let frequencyFromNoteNumber = 440 * Math.pow(2, (newNote - 69) / 12);
            let detune = Math.floor(1200 * Math.log(pitch / frequencyFromNoteNumber) / Math.log(2));
            const obj = noteFrequencies.find(item => item.index === newNote);
            noteName = obj ? obj.name : null;
            this.changeNoteInState(noteName)
        }

    }

    changeNoteInState = (newNote) => {
        const {currentNote, notesPlayed, notesToMimic, slidingWindow} = this.state;
        slidingWindow.push(newNote)
        slidingWindow.shift()

        const isAllSame = slidingWindow.every((value, index, array) => value === array[0]);
        const isChanged = (newNote && newNote !== currentNote)

        //"isChanged" considering continues note
        if (!isChanged || !isAllSame) return;

        notesPlayed.push(newNote)

        console.log("changing from " + currentNote + " to " + newNote)

        if (JSON.stringify(notesToMimic) === JSON.stringify(notesPlayed)) {
            this.handleSuccess()
        }

        this.setState({
            currentNote: newNote,
            notesPlayed
        })
    }

    handleSuccess = () => {
        this.setState({
            showReward: true,
        });
        this.stopListening()
        setTimeout(() => {
            this.setState({
                showReward: false,
            });
        }, 3000); // Hide the success reward after 3 seconds (3000 milliseconds)
    };
    render() {
        const { notesPlayed, notesToMimic, isRecording } = this.state;
        const baseNote = (notesToMimic.length) ? notesToMimic[0] : ''

        // const intervals = notesToMimic.map((note, idx)=>{
        //     if (idx === 0) return;
        //     return this.getStepsBetweenKeys(notesToMimic[idx], notesToMimic[idx-1])
        // })

        const noteSequence = notesPlayed.map((note, idx) => {
            const [noteName, octave] = note.split("-");
            const isMatched = (notesPlayed[idx] === notesToMimic[idx]) ? "matched" : ""
            return <div key={idx} className={"note-" + isMatched}>
                <div className={"tone-name"}>
                    {noteName}
                </div>
                <div className={"tone-octave"}>
                    {octave}
                </div>

            </div>
        })
        const recSign = (isRecording) ? " 🔴" : ""
        return (
            <>
                {this.state.showReward && <div className="success-reward">Success!</div>}
                <button id="generate-btn" type="button" onClick={this.generateSequence}>Generate</button>
                <button id="play-btn" type="button" onClick={this.playNotes}>Play</button>
                <button id="start-btn" type="button" onClick={this.startListening}>{"Start" + recSign}</button>
                <button id="stop-btn" type="button" onClick={this.stopListening}>Stop</button>
                <div>
                    <h2>Sequence: {baseNote}</h2>
                </div>
                <div className={"seq-wrapper"}>
                    <div className={"seq"}>Notes sequence: {noteSequence}</div>
                </div>
            </>

        );
    }
}

export default SoundDetector;
