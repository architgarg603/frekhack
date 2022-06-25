import parse from "html-react-parser";
import textgears from "textgears-api";
import MicRecorder from "mic-recorder-to-mp3";
import { useEffect, useState, useRef } from "react";
import {
  Box,
  Textarea,
  Button,
  Text,
  Container,
  HStack,
  VStack,
} from "@chakra-ui/react";
import axios from "axios";
const textgearsApi = textgears("Ymds03gpot0vbQ3v", { language: "en-US" });

const assembly = axios.create({
  baseURL: "https://api.assemblyai.com/v2",
  headers: {
    authorization: "a8c30e55b99d42e6801da25bfedd18cc",
    "content-type": "application/json",
    "transfer-encoding": "chunked",
  },
});

const Write = () => {
  const [text, settext] = useState("Sam are off to garden.");
  const [correction, setCOrrection] = useState("");
  const [suggestion, setSuggestions] = useState("");
  const [res, setRes] = useState("");
  // Mic-Recorder-To-MP3
  const recorder = useRef(null); //Recorder
  const audioPlayer = useRef(null); //Ref for the HTML Audio Tag
  const [blobURL, setBlobUrl] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [isRecording, setIsRecording] = useState(null);

  useEffect(() => {
    //Declares the recorder object and stores it inside of ref
    recorder.current = new MicRecorder({ bitRate: 128 });
  }, []);

  const startRecording = () => {
    // Check if recording isn't blocked by browser
    recorder.current.start().then(() => {
      setIsRecording(true);
    });
  };

  const stopRecording = () => {
    recorder.current
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const file = new File(buffer, "audio.mp3", {
          type: blob.type,
          lastModified: Date.now(),
        });
        const newBlobUrl = URL.createObjectURL(blob);
        setBlobUrl(newBlobUrl);
        setIsRecording(false);
        setAudioFile(file);
      })
      .catch((e) => console.log(e));
  };

  // AssemblyAI API

  // State variables
  const [uploadURL, setUploadURL] = useState("");
  const [transcriptID, setTranscriptID] = useState("");
  const [transcriptData, setTranscriptData] = useState("");
  const [transcript, setTranscript] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Upload the Audio File and retrieve the Upload URL
  useEffect(() => {
    if (audioFile) {
      assembly
        .post("/upload", audioFile)
        .then((res) => setUploadURL(res.data.upload_url))
        .catch((err) => console.error(err));
    }
  }, [audioFile]);

  // Submit the Upload URL to AssemblyAI and retrieve the Transcript ID
  const submitTranscriptionHandler = () => {
    assembly
      .post("/transcript", {
        audio_url: uploadURL,
      })
      .then((res) => {
        setTranscriptID(res.data.id);

        checkStatusHandler(res.data.id);
      })
      .catch((err) => console.error(err));
  };

  // Check the status of the Transcript
  const checkStatusHandler = async (id = transcriptID) => {
    console.log(id, transcriptID);
    if (!id) return;
    setIsLoading(true);
    try {
      await assembly.get(`/transcript/${id}`).then((res) => {
        setTranscriptData(res.data);
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Periodically check the status of the Transcript
  useEffect(() => {
    const interval = setInterval(() => {
      if (transcriptData.status !== "completed" && isLoading) {
        checkStatusHandler();
      } else {
        setIsLoading(false);
        if (transcriptData?.text) {
          setTranscript(transcriptData.text);
          settext(transcriptData.text);
        }
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  });
  const checkGrammar = () => {
    // setRes(res.data.matches[0].message);
    textgearsApi
      .checkGrammar(text)
      .then((data) => {
        console.log(data);
        for (const error of data.response.errors) {
          console.log(
            "Error: %s. Suggestions: %s",
            error.bad,
            error.better.join(", ")
          );
        }
        let err = data.response.errors;
        let ans = text;
        let sug = "";
        console.log(err);

        if (err.length === 0) {
          sug = "Congrats! No errors detected!";
          setSuggestions(sug);
        }

        for (let i = err.length - 1; i >= 0; i--) {
          let st = ans.substring(0, err[i].offset);
          let str = ans.substring(err[i].offset, err[i].offset + err[i].length);
          let ed = ans.substring(err[i].offset + err[i].length);

          ans = `${st}<span>${str}</span>${ed}`;
          sug = `
          Word: ${err[i].bad}
          Suggestions: ${err[i].better}
          Description: ${err[i].description.en}
          ${sug}`;
        }
        setSuggestions(sug);
        setCOrrection(ans);
      })
      .catch((err) => {});
  };
  let handleInputChange = (e) => {
    let inputValue = e.target.value;
    settext(inputValue);
  };
  return (
    <Container minW="container.md" py="12">
      <Box pt="12"></Box>
      <VStack mt="12">
        <Textarea
          value={text}
          onChange={handleInputChange}
          placeholder="Write/paste any content..."
          size="sm"
        />
        <HStack>
          <Button colorScheme={"yellow"} onClick={checkGrammar}>
            Check
          </Button>
          <Button>Reset</Button>
        </HStack>

        <audio ref={audioPlayer} src={blobURL} controls="controls" />
        <HStack>
          <Button disabled={isRecording} onClick={startRecording}>
            Start Recording
          </Button>
          <Button disabled={!isRecording} onClick={stopRecording}>
            Stop Recording
          </Button>
          <Button onClick={submitTranscriptionHandler} colorScheme="yellow">
            Submit Recording
          </Button>
        </HStack>
        <Box borderWidth="1px" borderRadius="lg" p="4">
          <span style={{ whiteSpace: "pre" }}>{suggestion}</span>
        </Box>
      </VStack>
    </Container>
  );
};

export default Write;
