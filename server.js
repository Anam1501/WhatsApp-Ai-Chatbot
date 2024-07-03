const express = require('express');
const {GoogleGenerativeAI} = require("@google/generative-ai")
const bodyParser = require('body-parser');
const axios = require('axios');

const app = express(); 
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));

app.post('/whatsapp', (req, res) => {
  const sender_id = req.body.From;
  const message = req.body.Body;
  const mediaUrl = req.body.MediaUrl0;
  console.log(`Received message from ${sender_id}: ${message}`);
  console.log(`Received message from ${sender_id}: ${mediaUrl}`);
  sendReply(sender_id, message, mediaUrl);
  res.status(200).send('OK');
});

//Gemini Model 
async function geminiModel(userInputText, userInputImage) {
  // For text-only input, use the gemini-pro model
  const genAI = new GoogleGenerativeAI("AIzaSyDyXPOLFe7fNNfHXkBXD23X3qBkaz46RG0");

  if (!userInputImage) {
    // Handle text-only input (no image URL)
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro" }); // Use gemini-1.0-pro for text-only
    const result = await model.generateContent([userInputText]);
    const response = await result.response;
    let text = response.text();
    return text;
  } else {
    // ... existing code for handling image URL (if present)
    const model = genAI.getGenerativeModel({ model: "gemini-1.0-pro-vision-latest"});
    // Converts a URL and mimeType to a GoogleGenerativeAI.Part object with fetched data
    async function urlToGenerativePart(url, mimeType) {
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      return {
        inlineData: {
          data: response.data.toString("base64"),
          mimeType
        },
      };
    }

    const imageUrl = userInputImage;
    const imageParts = await Promise.all([
      urlToGenerativePart(imageUrl, "image/png"), // Assuming JPEG format, adjust if needed
    ]);

    try {
      const result = await model.generateContent([userInputText, ...imageParts]);
      const response = await result.response;
      let text = response.text();
      return text;

    } catch (error) {
      console.error("Error generating content:", error);
      return "Error generating content.";
    }
    }
}

async function sendReply(sender_no, prompt, mediaUrl) {
  const accountSid = 'AC80d156f16a71378e578d0799c5a9ef5f';
  const authToken = 'f49d601ad011366ed6d544b38fc1e3dd';
  const client = require('twilio')(accountSid, authToken);
  const model_output = await geminiModel(prompt, mediaUrl);

  // Split the message into 1600 character chunks
  const chunks = chunkString(model_output, 1600);

  for (const chunk of chunks) {
    try {
      const response = await client.messages.create({
        from: 'whatsapp:+14155238886',
        to: sender_no,
        body: chunk
      });
      console.log(`Message sent successfully. SID: ${response.sid}`);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }
}

function chunkString(str, length) {
  const chunks = [];
  let currentChunk = "";
  for (let i = 0; i < str.length; i++) {
    currentChunk += str[i];
    if (currentChunk.length >= length) {
      chunks.push(currentChunk);
      currentChunk = "";
    }
  }
  chunks.push(currentChunk);
  return chunks;
}

app.listen(port, () => { 
  console.log(`Server running on http://localhost:${port}`); 
});