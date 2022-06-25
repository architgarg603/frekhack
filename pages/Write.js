import MicRecorder from "mic-recorder-to-mp3";
import { useEffect, useState, useRef } from "react";
import {
  Box,
  Textarea,
  Button,
  Text,
  Spinner,
  Container,
  HStack,
  VStack,
} from "@chakra-ui/react";
import axios from "axios";

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

        checkStatusHandler();
      })
      .catch((err) => console.error(err));
  };

  // Check the status of the Transcript
  const checkStatusHandler = async () => {
    setIsLoading(true);
    try {
      await assembly.get(`/transcript/${transcriptID}`).then((res) => {
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
        setTranscript(transcriptData.text);
        settext(transcriptData.text);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  });
  const checkGrammar = async () => {
    try {
      const res = await axios.post("/api/check", {
        text,
      });
      setRes(res.data.matches[0].message);
    } catch (err) {
      console.log(err);
    }
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
        <Text>{res}</Text>

        <audio ref={audioPlayer} src={blobURL} controls="controls" />
        <HStack>
          <Button disabled={isRecording} onClick={startRecording}>
            Start Recording
          </Button>
          <Button disabled={!isRecording} onClick={stopRecording}>
            Stop Recording
          </Button>
          <Button
            disabled={!isRecording}
            onClick={submitTranscriptionHandler}
            colorScheme="yellow"
          >
            Submit Recording
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
};

export default Write;
