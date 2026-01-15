import { useState, useEffect, useCallback, useRef } from "react";
import {
	Minus,
	MinusIcon,
	PlusIcon,
	PlayIcon,
	PauseIcon,
	XIcon,
} from "lucide-react";
export default function Read() {
	// words per minute - start with default value
	const [wpm, setWpm] = useState(300);
	const [currentWpm, setCurrentWpm] = useState(300);

	// Load from localStorage after component mounts (client-side only)
	useEffect(() => {
		const storedWpm = retrieveWpmFromLocalStorage();
		if (storedWpm !== null) {
			setWpm(storedWpm);
			setCurrentWpm(storedWpm);
		}
	}, []);
	const [textSize, setTextSize] = useState(24);
	useEffect(() => {
		const storedSize = retrieveTextSizeFromLocalStorage();
		if (storedSize !== null) {
			setTextSize(storedSize);
		}
	}, []);
	const [isPlaying, setIsPlaying] = useState(false);
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [draftText, setDraftText] = useState("");
	const [autoScaleEnabled, setAutoScaleEnabled] = useState(false);
	const [targetWpm, setTargetWpm] = useState(600);
	const [rampSeconds, setRampSeconds] = useState(30);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// Sample text for speed reading
	const [text, setText] = useState(
		"The quick brown fox jumps over the lazy dog. Speed reading helps you read faster while maintaining comprehension. Practice makes perfect."
	);
	const [currentWordIndex, setCurrentWordIndex] = useState(0);

	useEffect(() => {
		setDraftText(text);
	}, [text]);

	useEffect(() => {
		const storedAutoScale = retrieveAutoScaleFromLocalStorage();
		const storedTarget = retrieveTargetWpmFromLocalStorage();
		const storedRampSeconds = retrieveRampSecondsFromLocalStorage();
		if (storedAutoScale !== null) {
			setAutoScaleEnabled(storedAutoScale);
		}
		if (storedTarget !== null) {
			setTargetWpm(storedTarget);
		}
		if (storedRampSeconds !== null) {
			setRampSeconds(storedRampSeconds);
		}
	}, []);

	// Split text into words
	const words = text.split(/\s+/).filter((word) => word.length > 0);

	// Ref to capture the starting WPM when playback begins
	const rampStartWpmRef = useRef(wpm);
	const rampStartTimeRef = useRef<number | null>(null);
	const currentWpmRef = useRef(currentWpm);

	useEffect(() => {
		currentWpmRef.current = currentWpm;
	}, [currentWpm]);

	// Capture starting WPM when playback starts
	useEffect(() => {
		if (isPlaying) {
			rampStartWpmRef.current = wpm;
			rampStartTimeRef.current = Date.now();
		} else {
			rampStartTimeRef.current = null;
		}
	}, [isPlaying]);

	// Timer for advancing words - uses a smoother approach that doesn't reset on WPM changes
	useEffect(() => {
		if (!isPlaying) return;

		let lastWordTime = Date.now();
		let animationFrameId: number;

		const tick = () => {
			const now = Date.now();
			// Use ref to avoid resetting timer when speed changes
			const msPerWord = 60000 / currentWpmRef.current;
			const elapsed = now - lastWordTime;

			if (elapsed >= msPerWord) {
				lastWordTime = now;
				setCurrentWordIndex((prev) => {
					if (prev >= words.length - 1) {
						setIsPlaying(false);
						return 0;
					}
					return prev + 1;
				});
			}

			animationFrameId = requestAnimationFrame(tick);
		};

		animationFrameId = requestAnimationFrame(tick);

		return () => cancelAnimationFrame(animationFrameId);
	}, [isPlaying, words.length]);

	// Sync currentWpm with wpm when not playing
	useEffect(() => {
		if (!isPlaying) {
			setCurrentWpm(wpm);
		}
	}, [isPlaying, wpm]);

	// Auto-scale effect - ramps WPM from start to target over time
	useEffect(() => {
		if (!isPlaying || !autoScaleEnabled) {
			return;
		}

		// Auto-scale is enabled and we're playing
		const startWpm = rampStartWpmRef.current;
		const startedAt = rampStartTimeRef.current ?? Date.now();
		const clampedTarget = Math.max(startWpm, Math.min(1500, targetWpm));
		const durationMs = Math.max(1, rampSeconds) * 1000;

		const interval = setInterval(() => {
			const elapsed = Date.now() - startedAt;
			const progress = Math.min(elapsed / durationMs, 1);
			const nextWpm = Math.round(
				startWpm + (clampedTarget - startWpm) * progress
			);
			setCurrentWpm(nextWpm);
			if (progress >= 1) {
				clearInterval(interval);
			}
		}, 250);

		return () => clearInterval(interval);
	}, [isPlaying, autoScaleEnabled, targetWpm, rampSeconds]);

	function openTextDialog() {
		setDraftText(text);
		setIsDialogOpen(true);
	}

	function closeTextDialog() {
		setIsDialogOpen(false);
	}

	function applyTextUpdate(nextText: string) {
		const normalizedText = nextText.trim();
		setText(normalizedText.length > 0 ? normalizedText : "");
		setIsPlaying(false);
		setCurrentWordIndex(0);
		setIsDialogOpen(false);
	}

	async function handleFileUpload(file: File) {
		const content = await file.text();
		setDraftText(content);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	}

	return (
		<div className="flex flex-col items-center justify-between w-full h-full">
			<div></div>
			<WordDisplay word={words[currentWordIndex] || ""} textSize={textSize} />
			<Controls
				wpm={wpm}
				currentWpm={currentWpm}
				setWpm={setWpm}
				textSize={textSize}
				setTextSize={setTextSize}
				isPlaying={isPlaying}
				setIsPlaying={setIsPlaying}
				onOpenTextDialog={openTextDialog}
				autoScaleEnabled={autoScaleEnabled}
				setAutoScaleEnabled={setAutoScaleEnabled}
				targetWpm={targetWpm}
				setTargetWpm={setTargetWpm}
				rampSeconds={rampSeconds}
				setRampSeconds={setRampSeconds}
			/>
			{isDialogOpen ? (
				<div className="fixed inset-0 z-20 flex items-center justify-center bg-black/70 px-4">
					<div className="w-full max-w-2xl rounded-xl bg-neutral-900 p-6 shadow-xl">
						<div className="flex items-center justify-between">
							<h2 className="text-lg font-semibold text-neutral-100">
								Add text
							</h2>
							<button
								onClick={closeTextDialog}
								className="text-sm cursor-pointer text-neutral-400 transition-colors hover:text-neutral-200"
							>
								<XIcon size={16} />
							</button>
						</div>
						<p className="mt-2 text-sm text-neutral-500">
							Paste your text below or upload a .txt file to replace the reader
							content.
						</p>
						<textarea
							className="mt-4 h-48 w-full resize-none rounded-lg border border-neutral-700 bg-neutral-950 p-3 text-sm text-neutral-100 outline-none focus:border-neutral-500"
							value={draftText}
							onChange={(event) => setDraftText(event.target.value)}
							placeholder="Paste or type text to read"
						/>
						<div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div className="flex items-center gap-3">
								<input
									ref={fileInputRef}
									type="file"
									accept=".txt,text/plain"
									onChange={(event) => {
										const file = event.target.files?.[0];
										if (file) {
											handleFileUpload(file);
										}
									}}
									className="text-sm text-neutral-400 file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-2 file:text-sm file:text-neutral-200 hover:file:bg-neutral-700 cursor-pointer w-max"
								/>
								<span className="text-xs text-neutral-500">
									Supported: .txt
								</span>
							</div>
							<div className="flex items-center gap-3">
								<button
									onClick={closeTextDialog}
									className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-neutral-500 hover:text-neutral-100 cursor-pointer"
								>
									Close
								</button>
								<button
									onClick={() => applyTextUpdate(draftText)}
									className="rounded-md bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 cursor-pointer"
								>
									Use text
								</button>
							</div>
						</div>
					</div>
				</div>
			) : null}
		</div>
	);
}

type WordDisplayProps = {
	word: string;
	textSize: number;
};

function WordDisplay({ word, textSize }: WordDisplayProps) {
	// Calculate Optimal Recognition Point (ORP)
	// Typically around 1/3 into the word (slightly left of center)
	const getORPIndex = (word: string): number => {
		const length = word.length;
		if (length <= 1) return 0;
		if (length <= 5) return 1;
		if (length <= 9) return 2;
		if (length <= 13) return 3;
		return 4;
	};

	const orpIndex = getORPIndex(word);
	const beforeORP = word.slice(0, orpIndex);
	const orpChar = word[orpIndex] || "";
	const afterORP = word.slice(orpIndex + 1);

	return (
		<div className="flex items-center justify-center min-h-50">
			<div
				className="font-mono tracking-wide flex items-center justify-center"
				style={{ fontSize: `${textSize}px` }}
			>
				{/* Left padding to center the ORP character */}
				<span
					className="text-neutral-300 text-right"
					style={{ minWidth: "10ch" }}
				>
					{beforeORP}
				</span>

				{/* Optimal Recognition Point - highlighted */}
				<span className="text-red-500">{orpChar}</span>

				{/* Right side of word */}
				<span
					className="text-neutral-300 text-left"
					style={{ minWidth: "10ch" }}
				>
					{afterORP}
				</span>
			</div>
		</div>
	);
}

type ControlProps = {
	wpm: number;
	currentWpm: number;
	setWpm: (wpm: number) => void;
	textSize: number;
	setTextSize: (size: number) => void;
	isPlaying: boolean;
	setIsPlaying: (playing: boolean) => void;
	onOpenTextDialog: () => void;
	autoScaleEnabled: boolean;
	setAutoScaleEnabled: (enabled: boolean) => void;
	targetWpm: number;
	setTargetWpm: (wpm: number) => void;
	rampSeconds: number;
	setRampSeconds: (seconds: number) => void;
};

function storeWpmInLocalStorage(wpm: number) {
	if (typeof window !== "undefined" && window.localStorage) {
		localStorage.setItem("wpm", wpm.toString());
	}
}

function storeTextSizeInLocalStorage(size: number) {
	if (typeof window !== "undefined" && window.localStorage) {
		localStorage.setItem("textSize", size.toString());
	}
}

function storeAutoScaleInLocalStorage(enabled: boolean) {
	if (typeof window !== "undefined" && window.localStorage) {
		localStorage.setItem("autoScaleEnabled", enabled ? "1" : "0");
	}
}

function storeTargetWpmInLocalStorage(target: number) {
	if (typeof window !== "undefined" && window.localStorage) {
		localStorage.setItem("autoScaleTargetWpm", target.toString());
	}
}

function storeRampSecondsInLocalStorage(seconds: number) {
	if (typeof window !== "undefined" && window.localStorage) {
		localStorage.setItem("autoScaleRampSeconds", seconds.toString());
	}
}

function retrieveWpmFromLocalStorage(): number | null {
	if (typeof window !== "undefined" && window.localStorage) {
		const wpmString = localStorage.getItem("wpm");
		if (wpmString) {
			const wpm = Number(wpmString);
			if (!isNaN(wpm)) {
				return wpm;
			}
		}
	}
	return null;
}

function retrieveTextSizeFromLocalStorage(): number | null {
	if (typeof window !== "undefined" && window.localStorage) {
		const sizeString = localStorage.getItem("textSize");
		if (sizeString) {
			const size = Number(sizeString);
			if (!isNaN(size)) {
				return size;
			}
		}
	}
	return null;
}

function retrieveAutoScaleFromLocalStorage(): boolean | null {
	if (typeof window !== "undefined" && window.localStorage) {
		const stored = localStorage.getItem("autoScaleEnabled");
		if (stored === "1") return true;
		if (stored === "0") return false;
	}
	return null;
}

function retrieveTargetWpmFromLocalStorage(): number | null {
	if (typeof window !== "undefined" && window.localStorage) {
		const targetString = localStorage.getItem("autoScaleTargetWpm");
		if (targetString) {
			const target = Number(targetString);
			if (!isNaN(target)) {
				return target;
			}
		}
	}
	return null;
}

function retrieveRampSecondsFromLocalStorage(): number | null {
	if (typeof window !== "undefined" && window.localStorage) {
		const secondsString = localStorage.getItem("autoScaleRampSeconds");
		if (secondsString) {
			const seconds = Number(secondsString);
			if (!isNaN(seconds)) {
				return seconds;
			}
		}
	}
	return null;
}

function Controls({
	wpm,
	currentWpm,
	// update wpm
	setWpm,
	textSize,
	setTextSize,
	isPlaying,
	setIsPlaying,
	onOpenTextDialog,
	autoScaleEnabled,
	setAutoScaleEnabled,
	targetWpm,
	setTargetWpm,
	rampSeconds,
	setRampSeconds,
}: ControlProps) {
	const UPDATE_STEP = 50;
	const MAX_WPM = 1500;
	const MIN_WPM = 1;
	const MIN_TARGET_WPM = 1;
	const MIN_RAMP_SECONDS = 1;
	const MAX_RAMP_SECONDS = 180;
	const MAX_TEXT_SIZE = 72;
	const MIN_TEXT_SIZE = 8;
	const TEXT_SIZE_STEP = 2;

	function updateWpm(amount: number) {
		// if wpm is one and we are trying to increase, negate 1 to keep even numbers
		if (wpm === 1 && amount > 0) {
			amount -= 1;
		}
		const newWpm = Math.max(MIN_WPM, Math.min(MAX_WPM, wpm + amount));
		setWpm(newWpm);
		// Every update, store into local storage
		storeWpmInLocalStorage(newWpm);
	}

	function updateTextSize(newSize: number) {
		const clampedSize = Math.max(
			MIN_TEXT_SIZE,
			Math.min(MAX_TEXT_SIZE, newSize)
		);
		setTextSize(clampedSize);
		storeTextSizeInLocalStorage(clampedSize);
	}

	// Handle keyboard controls
	const handleKeyPress = useCallback(
		(event: KeyboardEvent) => {
			if (event.code === "Space") {
				event.preventDefault();
				setIsPlaying(!isPlaying);
			} else if (event.code === "ArrowRight") {
				event.preventDefault();
				updateWpm(UPDATE_STEP);
			} else if (event.code === "ArrowLeft") {
				event.preventDefault();
				updateWpm(UPDATE_STEP * -1);
			} else if (event.code === "ArrowUp") {
				event.preventDefault();
				updateTextSize(textSize + TEXT_SIZE_STEP);
			} else if (event.code === "ArrowDown") {
				event.preventDefault();
				updateTextSize(textSize - TEXT_SIZE_STEP);
			}
		},
		[isPlaying, wpm, textSize]
	);

	useEffect(() => {
		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [handleKeyPress]);

	return (
		<div className="flex flex-col gap-4 items-center justify-center">
			<div className="flex gap-8 text-neutral-500 items-center">
				<div className="flex gap-2">
					<button
						className="hover:text-neutral-200 duration-150 transition-colors cursor-pointer flex"
						onClick={onOpenTextDialog}
						title="Add text to read"
					>
						Add text
					</button>
				</div>
				<div className="flex gap-2">
					<button
						className="hover:text-neutral-200 duration-150 transition-colors cursor-pointer flex"
						onClick={() => setIsPlaying(!isPlaying)}
						title="Space: Toggle play/pause"
					>
						{isPlaying ? (
							<span className="flex items-center gap-1">
								<PauseIcon size={16} /> Pause
							</span>
						) : (
							<span className="flex items-center gap-1">
								<PlayIcon size={16} /> Play
							</span>
						)}
					</button>
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => updateWpm(UPDATE_STEP * -1)}
						className="hover:text-neutral-200 duration-150 transition-colors cursor-pointer"
						title="Left Arrow: Decrease speed"
					>
						<MinusIcon size={18} />
					</button>
					<span className="cursor-default">
						<input
							type="number"
							value={wpm}
							onChange={(e) => {
								const newValue = Number(e.target.value);
								if (!isNaN(newValue)) {
									const clampedValue = Math.max(
										MIN_WPM,
										Math.min(MAX_WPM, newValue)
									);
									setWpm(clampedValue);
									storeWpmInLocalStorage(clampedValue);
								}
							}}
							min={MIN_WPM}
							max={MAX_WPM}
							className="text-neutral-50 text-center border-none outline-none bg-transparent p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
							style={{ width: `${wpm.toString().length}ch` }}
						/>{" "}
						WPM
					</span>
					<button
						onClick={() => updateWpm(UPDATE_STEP)}
						className="hover:text-neutral-200 duration-150 transition-colors cursor-pointer"
						title="Right Arrow: Increase speed"
					>
						<PlusIcon size={18} />
					</button>
				</div>
				<div className="flex gap-2">
					<button
						onClick={() => updateTextSize(textSize - TEXT_SIZE_STEP)}
						className="hover:text-neutral-200 duration-150 transition-colors cursor-pointer"
						title="Down Arrow: Decrease text size"
					>
						<MinusIcon size={18} />
					</button>
					<span
						className="cursor-default"
						title="Up/Down Arrows: Change text size"
					>
						<input
							type="number"
							value={textSize}
							onChange={(e) => updateTextSize(Number(e.target.value))}
							min={MIN_TEXT_SIZE}
							max={MAX_TEXT_SIZE}
							className="text-neutral-50 text-center border-none outline-none bg-transparent p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
							style={{ width: "2ch" }}
						/>{" "}
						px
					</span>
					<button
						onClick={() => updateTextSize(textSize + TEXT_SIZE_STEP)}
						className="hover:text-neutral-200 duration-150 transition-colors cursor-pointer"
						title="Up Arrow: Increase text size"
					>
						<PlusIcon size={18} />
					</button>
				</div>
			</div>
			<div className="flex flex-wrap items-center justify-center gap-3 text-xs text-neutral-500">
				<label className="flex items-center gap-2 cursor-pointer">
					<input
						type="checkbox"
						checked={autoScaleEnabled}
						onChange={(event) => {
							setAutoScaleEnabled(event.target.checked);
							storeAutoScaleInLocalStorage(event.target.checked);
						}}
						className="accent-amber-600"
					/>
					Auto ramp
				</label>
				<div className="flex items-center gap-2">
					<span className="text-neutral-400">Current</span>
					<span className="font-semibold text-neutral-200">{currentWpm}</span>
					<span>WPM</span>
				</div>
				<div className="flex items-center gap-2">
					<span>Target</span>
					<input
						type="number"
						value={targetWpm}
						onChange={(event) => {
							const value = Number(event.target.value);
							if (!isNaN(value)) {
								const clamped = Math.max(
									MIN_TARGET_WPM,
									Math.min(MAX_WPM, value)
								);
								setTargetWpm(clamped);
								storeTargetWpmInLocalStorage(clamped);
							}
						}}
						min={MIN_TARGET_WPM}
						max={MAX_WPM}
						className="w-16 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100"
					/>
					<span>WPM</span>
				</div>
				<div className="flex items-center gap-2">
					<span>Over</span>
					<input
						type="number"
						value={rampSeconds}
						onChange={(event) => {
							const value = Number(event.target.value);
							if (!isNaN(value)) {
								const clamped = Math.max(
									MIN_RAMP_SECONDS,
									Math.min(MAX_RAMP_SECONDS, value)
								);
								setRampSeconds(clamped);
								storeRampSecondsInLocalStorage(clamped);
							}
						}}
						min={MIN_RAMP_SECONDS}
						max={MAX_RAMP_SECONDS}
						className="w-16 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1 text-xs text-neutral-100"
					/>
					<span>sec</span>
				</div>
			</div>
			<div className="text-center text-xs text-neutral-600">
				<p>Space: Play/Pause | ← →: Speed | ↑ ↓: Text Size</p>
			</div>
		</div>
	);
}
