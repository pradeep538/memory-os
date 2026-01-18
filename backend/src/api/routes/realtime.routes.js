import audioEnhancementService from '../../services/input/audioEnhancementService.js';
import MemoryModel from '../../models/memory.model.js';
import storageService from '../../services/storage/storageService.js';
import queue from '../../lib/queue.js';
import db from '../../db/index.js';

async function realtimeRoutes(fastify, options) {
    fastify.get('/input', { websocket: true }, async (connection, req) => {
        // Handle different @fastify/websocket versions
        const socket = connection.socket || connection;

        // Extract userId from query (WebSocket Handshake) or Auth middleware
        // NOTE: This is likely the Firebase UID, not the internal UUID
        const passedId = req.query.userId || req.userId || 'anonymous';

        let internalUserId = null;

        // Resolve Internal UUID
        if (passedId && passedId !== 'anonymous') {
            try {
                // Check if it's already a UUID (v4)
                const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
                if (uuidRegex.test(passedId)) {
                    internalUserId = passedId;
                } else {
                    // Assume it's Firebase UID, lookup internal ID
                    const userRes = await db.query('SELECT id FROM users WHERE firebase_uid = $1', [passedId]);
                    if (userRes.rows.length > 0) {
                        internalUserId = userRes.rows[0].id;
                    } else {
                        console.warn(`⚠️ WS: User not found for Firebase UID: ${passedId}`);
                        // Optionally create? For now, leave null to trigger error or fallback
                    }
                }
            } catch (err) {
                console.error('❌ WS User Lookup Failed:', err);
            }
        }

        console.log(`🔌 WS Connected: ${passedId} (Internal: ${internalUserId || 'Unresolved'})`);

        // Accumulate audio chunks
        let audioChunks = [];

        // on('message') provides (data, isBinary) in 'ws' v8+
        socket.on('message', async (message, isBinary) => {
            // Robust check: use isBinary flag if available, otherwise check buffer content
            const isBinaryMessage = isBinary !== undefined ? isBinary : Buffer.isBuffer(message) && !message.toString().trim().startsWith('{');

            if (isBinaryMessage) {
                audioChunks.push(message);
            } else {
                // Handle control messages (JSON)
                try {
                    console.log('📩 WS Control Message:', message.toString());
                    const data = JSON.parse(message.toString());
                    if (data.type === 'end') {
                        if (!internalUserId) {
                            socket.send(JSON.stringify({ type: 'error', message: 'User not identified' }));
                            return;
                        }
                        await processAudioStream(socket, audioChunks, internalUserId);
                        audioChunks = []; // Clear buffer
                    }
                } catch (e) {
                    console.error('WS Message Error:', e);
                }
            }
        });


        socket.on('close', () => {
            console.log('🔌 WS Closed');
            // If connection closes but we have chunks, should we process? 
            // Usually explicit 'end' is safer, but "In-Memory Pass-Through" implies we might want to salvage data.
            // For now, discard partial if not explicitly ended? Or auto-process?
            // Let's safe-guard: if > 100KB, try to process.
            if (audioChunks.length > 0) {
                // processAudioStream(socket, audioChunks, userId).catch(err => console.error('Close-processing failed', err));
            }
        });
    });
}

async function processAudioStream(socket, chunks, userId) {
    if (chunks.length === 0) return;

    const fullBuffer = Buffer.concat(chunks);
    const duration = 6; // Default or estimate from buffer size? WAV/PCM size allows calc. Opus is harder.
    // For now use default 6s or pass in 'end' message.
    console.log(`🎙️ Processing Stream: ${chunks.length} chunks, Total: ${fullBuffer.length} bytes`);

    // Send "Processing" status
    socket.send(JSON.stringify({ type: 'status', status: 'processing' }));

    // Check for empty buffer
    if (fullBuffer.length < 100) {
        console.warn('⚠️ Audio buffer too small, ignoring.');
        socket.send(JSON.stringify({ type: 'error', message: 'Audio too short' }));
        return;
    }

    const processingStart = Date.now();

    // --- HELPER: WRAP RAW PCM IN WAV HEADER ---
    const addWavHeader = (samples, sampleRate = 16000, numChannels = 1, bitDepth = 16) => {
        const buffer = Buffer.alloc(44 + samples.length);

        // RIFF chunk descriptor
        buffer.write('RIFF', 0);
        buffer.writeUInt32LE(36 + samples.length, 4); // ChunkSize
        buffer.write('WAVE', 8);

        // fmt sub-chunk
        buffer.write('fmt ', 12);
        buffer.writeUInt32LE(16, 16); // Subchunk1Size
        buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
        buffer.writeUInt16LE(numChannels, 22);
        buffer.writeUInt32LE(sampleRate, 24);
        buffer.writeUInt32LE(sampleRate * numChannels * (bitDepth / 8), 28); // ByteRate
        buffer.writeUInt16LE(numChannels * (bitDepth / 8), 32); // BlockAlign
        buffer.writeUInt16LE(bitDepth, 34);

        // data sub-chunk
        buffer.write('data', 36);
        buffer.writeUInt32LE(samples.length, 40);

        samples.copy(buffer, 44);
        return buffer;
    };

    // Convert raw PCM to proper WAV
    const wavBuffer = addWavHeader(fullBuffer);

    // --- PARALLEL EXECUTION START ---

    // PATH B: Persistence (Fire & Forget)
    // We don't await this for the response, but we want to ensure it doesn't fail silently.
    const persistencePromise = (async () => {
        try {
            const filename = `voice_ws_${userId}_${Date.now()}.wav`; // WAV format
            // 1. Upload
            const uploadResult = await storageService.saveFile(wavBuffer, filename, 'audio/wav');

            // 2. Create Memory Record
            const memory = await MemoryModel.create({
                userId: userId || 'anonymous',
                rawInput: '[Realtime Audio]',
                source: 'voice_realtime',
                eventType: 'user_log',
                category: 'generic',
                normalizedData: {
                    audio_path: uploadResult.key,
                    audio_url: uploadResult.url,
                    latency_ms: Date.now() - processingStart
                },
                status: 'tentative'
            });

            // 3. Queue for background jobs (Analysis etc)
            await queue.send('process-memory', { memoryId: memory.id });
            console.log(`💾 Path B: Persisted memory ${memory.id}`);
            return memory;
        } catch (e) {
            console.error('❌ Path B Failed:', e);
            // Backup?
        }
    })();

    // PATH A: Inference (Critical Path)
    try {
        const result = await audioEnhancementService.enhanceFromAudio(wavBuffer, 'audio/wav', duration);

        // --- BUSINESS LOGIC: CONFIRMATION ---
        let needsConfirmation = false;

        if (result.success) {
            // Handle silence or no speech detected
            if (result.is_speech === false || result.detected_category === 'none') {
                console.warn('🔇 WebSocket: No speech detected by Gemini.');

                // Cleanup: Delete the tentative memory if it exists
                const persistedMemory = await persistencePromise;
                if (persistedMemory) {
                    try {
                        await db.query('DELETE FROM memories WHERE id = $1', [persistedMemory.id]);
                        console.log(`🗑️ Deleted tentative memory ${persistedMemory.id} (No speech detected)`);
                    } catch (delErr) {
                        console.error('Failed to delete silent memory:', delErr);
                    }
                }

                socket.send(JSON.stringify({
                    type: 'error',
                    message: 'No speech detected. Please speak clearly.',
                    code: 'NO_SPEECH'
                }));
                return;
            }

            const confidence = result.confidence || 0;
            const category = result.detected_category;

            // "only show confirmation prompt if confidance is lessthan 60% and if it is derived as financial memory"
            if (category === 'finance' && confidence < 0.6) {
                needsConfirmation = true;
            }

            // Sync with Persistence: Update the placeholder memory with actual text
            const persistedMemory = await persistencePromise;
            console.log('📝 Attempting to update memory:', {
                id: persistedMemory?.id,
                userId: userId,
                transcription: result.transcription
            });

            if (persistedMemory) {
                try {
                    const updateResult = await MemoryModel.updateEnhancement(persistedMemory.id, userId, {
                        rawInput: result.transcription || result.enhanced_text || '[Audio Processing Failed]',
                        normalizedData: {
                            ...persistedMemory.normalizedData,
                            enhanced_text: result.enhanced_text,
                            confidence: confidence,
                            needs_confirmation: needsConfirmation
                            // Do not override audio_path etc
                        },
                        category: category || persistedMemory.category,
                        confidenceScore: confidence,
                        status: needsConfirmation ? 'tentative' : 'validated' // Use 'validated' instead of 'processed'
                    });
                    console.log(`✅ Updated memory ${persistedMemory.id} with transcription. Row count:`, updateResult ? 1 : 0);
                    if (!updateResult) {
                        console.error('❌ Update returned null - ID or UserID might not match');
                    } else {
                        // Publish EVENT for background workers (Plan Update, Analytics, etc.)
                        try {
                            await queue.send('memory.created', {
                                userId,
                                memoryId: persistedMemory.id,
                                text: result.enhanced_text || result.transcription
                            });
                            console.log(`⚡ WebSocket: Published memory.created for ${persistedMemory.id}`);
                        } catch (qErr) {
                            console.warn('WebSocket: Failed to publish memory.created:', qErr);
                        }
                    }
                } catch (updateErr) {
                    console.error('Failed to update persisted memory:', updateErr);
                }
            }
        }

        // Response
        const responsePayload = {
            type: 'result',
            success: result.success,
            data: {
                memory: await persistencePromise, // Send full memory object if available
                transcription: result.transcription,
                enhanced_text: result.enhanced_text,
                category: result.detected_category,
                confidence: result.confidence,
                needs_confirmation: needsConfirmation,
                confirmation_message: result.confirmation_message
            },
            latency_ms: Date.now() - processingStart
        };

        socket.send(JSON.stringify(responsePayload));

    } catch (e) {
        console.error('❌ Path A Failed:', e);
        socket.send(JSON.stringify({ type: 'error', message: 'Processing failed' }));
    }

    // Ensure persistence finishes eventually (optional, usually node keeps running)
    // await persistencePromise; 
}

export default realtimeRoutes;
