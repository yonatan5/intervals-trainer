import React, {Component} from 'react';
import * as Tone from "tone";
import './pithc.css';

class SoundDetector extends Component {
    constructor(props) {
        super(props);
        const BUFLEN = 2048;
        
        this.changeNoteOnState = this.changeNoteOnState.bind(this)
        this.newIncomingPitch = this.newIncomingPitch.bind(this)
        
        let sequenceToMimic = localStorage.getItem("sequenceToMimic")
        if (!sequenceToMimic) {
            sequenceToMimic = JSON.stringify(["C-5", "D-5", "E-5", "D-5"])
            localStorage.setItem("sequenceToMimic", sequenceToMimic)
        }

        const noteFrequencies = [
            // {name: 'C-3', frequency: 130.81, index: 48},
            // {name: 'C♯/D♭-3', frequency: 138.59, index: 49},
            {name: 'D-3', frequency: 146.83, index: 50},
            {name: 'D♯/E♭-3', frequency: 155.56, index: 51},
            {name: 'E-3', frequency: 164.81, index: 52},
            {name: 'F-3', frequency: 174.61, index: 53},
            {name: 'F♯/G♭-3', frequency: 185.00, index: 54},
            {name: 'G-3', frequency: 196.00, index: 55},
            {name: 'G♯/A♭-3', frequency: 207.65, index: 56},
            {name: 'A-3', frequency: 220.00, index: 57},
            {name: 'A♯/B♭-3', frequency: 233.08, index: 58},
            {name: 'B-3', frequency: 246.94, index: 59},
            {name: 'C-4', frequency: 261.63, index: 60},
            {name: 'C♯/D♭-4', frequency: 277.18, index: 61},
            {name: 'D-4', frequency: 293.66, index: 62},
            {name: 'D♯/E♭-4', frequency: 311.13, index: 63},
            {name: 'E-4', frequency: 329.63, index: 64},
            {name: 'F-4', frequency: 349.23, index: 65},
            {name: 'F♯/G♭-4', frequency: 369.99, index: 66},
            {name: 'G-4', frequency: 392.00, index: 67},
            {name: 'G♯/A♭-4', frequency: 415.30, index: 68},
            {name: 'A-4', frequency: 440.00, index: 69},
            {name: 'A♯/B♭-4', frequency: 466.16, index: 70},
            {name: 'B-4', frequency: 493.88, index: 71},
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
        ];
        this.state = {
            audioContext: null,
            progressColector: {
                successes: 0,
                retries: 0
            },
            noteFrequencies,
            mediaStream: null,
            source: null,
            analyser: null,
            lastNoteDetected: '',
            MAX_SIZE: null,
            rafID: null,
            isRecording: false,
            buf: new Float32Array(BUFLEN),
            sequenceToMimic: JSON.parse(sequenceToMimic),
            sequenceIntervals: [],
            slidingNotesInput: ["@", "#", "$", "%"],
            notesPlayed: []
        };


    }

    componentDidMount() {
        let urlWithQuery = window.location.href;

        // Get the base URL without the query string
        let params = new URLSearchParams(urlWithQuery.split('?')[1]);

        // Get the value of the 'param1' parameter
        let startValue = params.get('start');

        if (startValue) {
            this.startListening()
            window.history.pushState({path: "http://localhost:3000"}, '', "http://localhost:3000");
        }

        let item = localStorage.getItem("sequenceToMimic");
        const sequenceToMimic = JSON.parse(item)
        this.setState({
            sequenceToMimic,
            sequenceIntervals: this.getDistanceByName(sequenceToMimic)
        })
    }

    componentWillUnmount() {
        localStorage.setItem("sequenceToMimic", JSON.stringify(this.state.sequenceToMimic))
        this.stopListening();
    }

    startListening = () => {

        const rafID = setInterval(this.newIncomingPitch, 150);

        // Get audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.setState({
            audioContext,
            MAX_SIZE: Math.max(4, Math.floor(audioContext.sampleRate / 5000)),	// corresponds to a 5kHz signal
            rafID,
            notesPlayed: [],
            lastNoteDetected: '',
            slidingNotesInput: ["@", "#", "$", "%"],
            isRecording: true
        })

        // Get media stream
        navigator.mediaDevices.getUserMedia({audio: true, video: false})
            .then((mediaStream) => {
                // Create source from media stream
                const source = audioContext.createMediaStreamSource(mediaStream);
                // Create analyser
                const analyser = audioContext.createAnalyser();
                this.setState({source, mediaStream, analyser});
                source.connect(analyser);
            })
            .catch(console.error);
    };

    generateSequence = () => {
        const {noteFrequencies} = this.state
        let maxDistance = 4
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

        let notesGen = notes.map(n => n.name);
        localStorage.setItem("sequenceToMimic", JSON.stringify(notesGen))

        const sequenceIntervals = this.getDistanceByName(notesGen);
        this.setState({
            sequenceToMimic: notesGen,
            sequenceIntervals
        },this.playNotes);

    }

    getDistanceByName(namesArray) {
        const {noteFrequencies} = this.state

        //numbers of semitone steps of the given array
        const result = [];

        for (let i = 0; i < namesArray.length - 1; i++) {
            const name1 = namesArray[i];
            const name2 = namesArray[i + 1];

            const idx1 = noteFrequencies.find(item => item.name === name1)?.index;
            const idx2 = noteFrequencies.find(item => item.name === name2)?.index;
            result.push(idx2 - idx1)
        }

        return result;
    }
    
    playNotes = () => {
        let {sequenceToMimic} = this.state
        this.stopListening()

        for (let i = 0; i < sequenceToMimic.length; i++) {
            sequenceToMimic[i] = sequenceToMimic[i].replace('-', ''); // remove '-'
            sequenceToMimic[i] = sequenceToMimic[i].replace('♯', '#'); // replace '♯' with '#'
            sequenceToMimic[i] = sequenceToMimic[i].replace('♭', 'b'); // replace '♭' with 'b'
            sequenceToMimic[i] = sequenceToMimic[i].replace('/', sequenceToMimic[i].charAt(sequenceToMimic[i].length - 1) + '/'); // add octave number
        }

        const synth = new Tone.Synth().toDestination();
        const duration = "2n";
        let index = 0;

        const playNextNote = () => {
            if (index < sequenceToMimic.length) {
                synth.triggerAttackRelease(sequenceToMimic[index], duration);
                index++;
                Tone.Transport.scheduleOnce(playNextNote, `+${duration}`);
            } else {
                Tone.Transport.stop();
                this.startListening()

                const baseURL = "http://localhost:3000?start=1";//replay is buggy. workaround.
                window.history.pushState({path: baseURL}, '', baseURL);
                window.location.reload()

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
        this.setState({isRecording: false})
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

    newIncomingPitch = () => {
        const {analyser, buf, audioContext, noteFrequencies} = this.state;

        if (!analyser) return;
        analyser.getFloatTimeDomainData(buf);

        let pitch = this.autoCorrelate(buf, audioContext.sampleRate);
        // TODO: Paint confidence meter on canvasElem here.

        let newNote, noteName
        if (pitch !== -1) {
            newNote = Math.round(12 * (Math.log(pitch / 440) / Math.log(2))) + 69;
            // let frequencyFromNoteNumber = 440 * Math.pow(2, (newNote - 69) / 12);
            // let detune = Math.floor(1200 * Math.log(pitch / frequencyFromNoteNumber) / Math.log(2));
            const obj = noteFrequencies.find(item => item.index === newNote);
            noteName = obj ? obj.name : null;
            this.changeNoteOnState(noteName)
        }

    }

    changeNoteOnState = (newNote) => {
        const {lastNoteDetected, notesPlayed, sequenceToMimic, slidingNotesInput,  progressColector} = this.state;
        slidingNotesInput.push(newNote)
        slidingNotesInput.shift()

        const isAllSame = slidingNotesInput.every((value, index, array) => value === array[0]);
        const isChanged = (newNote && newNote !== lastNoteDetected)

        //"isChanged" considering continues note
        if (!isChanged || !isAllSame) return;

        notesPlayed.push(newNote)

        console.log("changing from " + lastNoteDetected + " to " + newNote)

        if (sequenceToMimic.length === notesPlayed.length) {
            if (JSON.stringify(sequenceToMimic) === JSON.stringify(notesPlayed)) {
                this.handleSuccess()
            } else {
                //retry
               this.playNotes()

                progressColector.retries++
            }
        }

        this.setState({
            lastNoteDetected: newNote,
            notesPlayed,
            progressColector
        })
    }

    handleSuccess = () => {
        //in avg play each sequence twice then move on
        if (Math.random() > 0.5){
            this.generateSequence() 
        }else{
            this.playNotes()
        }
        const { successes, retries } = this.state.progressColector;
        this.setState({
            showReward: true,
            progressColector: {
                successes: successes + 1,
                retries: retries
            }
        });
        setTimeout(() => {
            this.setState({
                showReward: false,
            });
        }, 3000); // Hide the success reward after 3 seconds (3000 milliseconds)
    };

    render() {
        const {notesPlayed, sequenceToMimic, isRecording, sequenceIntervals, progressColector: { successes, retries }} = this.state;
        const baseNote = (sequenceToMimic.length) ? sequenceToMimic[0] : ''

        const noteSequence = notesPlayed.map((note, idx) => {
            const [noteName, octave] = note.split("-");
            const isMatched = (notesPlayed[idx] === sequenceToMimic[idx]) ? "matched" : ""

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

        const intervalSeq = sequenceIntervals.map((interval, idx) => {

            return <div key={idx} className={"interval"}>
                    {interval}
            </div>
        })

        return (
            <>
                {this.state.showReward && <div className="success-reward">Success!</div>}
                <button id="generate-btn" type="button" onClick={this.generateSequence}>Generate</button>
                <button id="play-btn" type="button" onClick={this.playNotes}>Play</button>
                <button id="start-btn" type="button" onClick={this.startListening}>{"Start" + recSign}</button>
                <button id="stop-btn" type="button" onClick={this.stopListening}>Stop</button>
                <div className={"progressColector"}>
                    {"successes: " + successes + ". retries: " + retries}
                </div>
                <div>
                    <div className={"sequence"}>
                        <h2>Sequence: {baseNote}</h2>
                        <div className={"intervals"}>{intervalSeq}</div>
                    </div>
                </div>
                <div className={"seq-wrapper"}>
                    <div className={"seq"}>Notes sequence: {noteSequence}</div>
                </div>
            </>

        );
    }
}

export default SoundDetector;
