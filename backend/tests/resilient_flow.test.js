
import { jest } from '@jest/globals';

// Mocks
const mockUpdateEnhancement = jest.fn();
const mockUpdateStatus = jest.fn();
const mockGetFile = jest.fn();
const mockEnhanceAudio = jest.fn();
const mockEnhanceText = jest.fn();

// Mock imports using unstable_mockModule
jest.unstable_mockModule('../src/models/memory.model.js', () => ({
    default: {
        updateEnhancement: mockUpdateEnhancement,
        updateStatus: mockUpdateStatus
    }
}));

jest.unstable_mockModule('../src/services/storage/storageService.js', () => ({
    default: {
        getFile: mockGetFile
    }
}));

jest.unstable_mockModule('../src/services/input/audioEnhancementService.js', () => ({
    default: {
        enhanceFromAudio: mockEnhanceAudio
    }
}));

jest.unstable_mockModule('../src/services/input/inputEnhancementService.js', () => ({
    default: {
        enhance: mockEnhanceText
    }
}));

jest.unstable_mockModule('../src/config/index.js', () => ({
    default: {}
}));

jest.unstable_mockModule('../src/db/index.js', () => ({
    default: { query: jest.fn() }
}));


// Import module under test (Dynamic import after mocks)
const { processAudioMemory, processTextRecovery } = await import('../src/workers/memory.worker.js');

describe('Resilient Worker Flow', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Audio Flow: Should save transcript (Checkpoint 1) and then enhancement (Checkpoint 2)', async () => {
        // Setup
        const memory = {
            id: 'mem_123',
            user_id: 'user_1',
            source: 'voice',
            status: 'processing',
            normalized_data: {
                audio_path: 'audio.m4a',
                mime_type: 'audio/mp4',
                duration: 10
            }
        };

        const mockAudioBuffer = Buffer.from('audio');
        mockGetFile.mockResolvedValue(mockAudioBuffer);

        const mockEnhancement = {
            success: true,
            transcription: 'Hello world',
            enhanced_text: 'Hello, World!',
            confidence: 0.9,
            detected_category: 'test',
            detected_entities: {}
        };
        mockEnhanceAudio.mockResolvedValue(mockEnhancement);

        // Execute
        await processAudioMemory(memory);

        // Verify
        expect(mockGetFile).toHaveBeenCalledWith('audio.m4a');
        expect(mockEnhanceAudio).toHaveBeenCalled();

        // Checkpoint 1: Transcribed
        expect(mockUpdateEnhancement).toHaveBeenNthCalledWith(1,
            'mem_123',
            'user_1',
            expect.objectContaining({
                rawInput: 'Hello world',
                status: 'transcribed'
            })
        );

        // Checkpoint 2: Validated
        expect(mockUpdateEnhancement).toHaveBeenNthCalledWith(2,
            'mem_123',
            'user_1',
            expect.objectContaining({
                rawInput: 'Hello, World!',
                status: 'validated'
            })
        );
    });

    test('Recovery Flow: Should enhance from raw input (text/transcript)', async () => {
        // Setup
        const memory = {
            id: 'mem_456',
            user_id: 'user_1',
            raw_input: 'Hello world',
            source: 'text',
            status: 'failed_enhancement',
            normalized_data: {}
        };

        const mockEnhancement = {
            success: true,
            raw_text: 'Hello world',
            enhanced_text: 'Hello, World! (Enhanced)',
            confidence: 0.85,
            detected_category: 'notes',
            detected_entities: {}
        };
        mockEnhanceText.mockResolvedValue(mockEnhancement);

        // Execute
        await processTextRecovery(memory);

        // Verify
        expect(mockEnhanceText).toHaveBeenCalledWith('Hello world', 'text');

        expect(mockUpdateEnhancement).toHaveBeenCalledWith(
            'mem_456',
            'user_1',
            expect.objectContaining({
                rawInput: 'Hello, World! (Enhanced)',
                status: 'validated'
            })
        );
    });

    test('Audio Fail: Should throw and NOT save validated if Gemini fails', async () => {
        const memory = {
            id: 'mem_fail',
            status: 'processing',
            normalized_data: { audio_path: 'fail.m4a' }
        };

        mockGetFile.mockResolvedValue(Buffer.from('...'));
        mockEnhanceAudio.mockResolvedValue({ success: false, error: 'API Error' });

        await expect(processAudioMemory(memory)).rejects.toThrow('API Error');

        expect(mockUpdateEnhancement).not.toHaveBeenCalled();
    });
});
