import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	SafeAreaView,
	Text,
	Pressable,
	ScrollView,
	TextInput,
	KeyboardAvoidingView,
	Keyboard,
	Image,
	Alert,
	useColorScheme,
} from "react-native";
import GlobalStyle from "../../globalStyle/GlobalStyle";
import { Ionicons, Feather, AntDesign } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { insertDiary } from "../../util/database";
import ModeColorStyle from "../../globalStyle/ModeColorStyle";
import {
	COLOR_BLACK,
	COLOR_DARK_RED,
	COLOR_DARK_SECONDARY,
	COLOR_DARK_THIRD,
	COLOR_DARK_WHITE,
	COLOR_LIGHT_RED,
	COLOR_LIGHT_SECONDARY,
	COLOR_LIGHT_THIRD,
} from "../../globalStyle/color";
import HeaderText from "../../components/Header";

const WriteContent = ({ navigation, route }) => {
	const isDark = useColorScheme() === "dark";

	const [dSubject, setDSubject] = useState([]); // 일기 주제
	const [dMood, setDMood] = useState("");
	const [dWeather, setDWeather] = useState("");
	const [dDate, setDDate] = useState(""); // 일기 날짜
	const [dTitle, setDTitle] = useState(""); // 일기 제목
	const [dContent, setDContent] = useState(""); // 일기 내용
	const [contentLength, setContentLength] = useState(0);
	const [canSave, setCanSave] = useState(
		isDark ? COLOR_DARK_THIRD : COLOR_LIGHT_THIRD
	);
	const [selectedImage, setSelectedImage] = useState("");

	const [isRecording, setIsRecording] = useState(false);
	const [sound, setSound] = useState(null);
	const [isPlaying, setIsPlaying] = useState(false);
	const [recording, setRecording] = useState();
	const [audioData, setAudioData] = useState({});

	useEffect(() => {
		const { params } = route;
		const selectedTopic = params.selectedTopic;
		const selectedMood = params.selectedMood;
		const selectedWeather = params.selectedWeather;
		const selectedDate = params.selectedDate;
		setDSubject(selectedTopic);
		setDMood(selectedMood);
		setDWeather(selectedWeather);
		setDDate(selectedDate);
	}, []);

	const pickImage = async () => {
		let imageData = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ImagePicker.MediaTypeOptions.All,
			allowsEditing: true,
			aspect: [4, 3],
			quality: 1,
		});
		if (!imageData.canceled) {
			setSelectedImage(imageData.assets[0].uri);
		}
	};

	const handleSave = async () => {
		try {
			const isSaved = await insertDiary(
				dDate,
				dTitle,
				dMood,
				dWeather,
				selectedImage,
				dContent,
				audioData
			);
			isSaved
				? navigation.navigate("HomeTab")
				: Alert.alert("저장 실패!", "다시 시도해주세요");
		} catch (e) {
			console.error(e);
		}
	};

	/**
	 * 음성 녹음 / stt 관련 함수
	 */

	React.useEffect(() => {
		getData();
	}, []);

	const generateUniqueId = () => {
		return Math.random().toString(36).substr(2, 9);
	};

	const stopRecording = async () => {
		console.log("Stopping recording..");
		setIsRecording(false);
		setRecording(undefined);
		await recording.stopAndUnloadAsync();
		const recordingUri = recording.getURI();

		const { sound, status } = await recording.createNewLoadedSoundAsync();
		const audioId = generateUniqueId();
		const audio = {
			id: audioId,
			sound: sound,
			file: recordingUri,
			status: status,
		};

		//스토리지 저장
		await AsyncStorage.setItem(`audio_${audio.id}`, JSON.stringify(audio));
		setAudioData(audio);
	};

	const startRecording = async () => {
		setIsRecording(true);
		try {
			console.log("Requesting permissions..");
			await Audio.requestPermissionsAsync();
			await Audio.setAudioModeAsync({
				allowsRecordingIOS: true,
				playsInSilentModeIOS: true,
			});

			console.log("Starting recording..");
			const { recording } = await Audio.Recording.createAsync(
				Audio.RecordingOptionsPresets.HIGH_QUALITY
			);
			setRecording(recording);
			console.log("Recording started");
		} catch (error) {
			console.error("Failed to start recording:", error);
		}
	};

	/**
	 * 녹음 재생
	 */
	const getData = async () => {
		try {
			const audio = await AsyncStorage.getItem(`audio_${audioData.id}`);
			if (audio) {
				setAudioData(JSON.parse(audio));
			}
		} catch (e) {
			console.log(e);
		}
	};

	const playAudio = async () => {
		if (audioData) {
			const newsound = new Audio.Sound();
			await newsound.loadAsync({ uri: audioData.file, shouldPlay: true });
			console.log("Playing Sound");
			setSound(newsound);
			await newsound.playAsync();
			setIsPlaying(true);
		} else {
			Alert.alert("재생할 녹음이 없습니다.");
		}
	};

	const stopAudio = async () => {
		if (sound) {
			if (isPlaying) {
				await sound.stopAsync(); // 오디오 멈추기
				console.log("Sound stopped");
				setIsPlaying(false);
			} else {
				await sound.playAsync(); // 오디오 다시 재생하기
				console.log("Sound restart");
				setIsPlaying(true);
			}
		}
	};

	/**
	 * 녹음 삭제해주는 함수
	 */
	const deleteAudio = () => {
		Alert.alert(
			"녹음을 삭제하시겠습니까?",
			"삭제하신 내용은 복구가 불가능합니다.",
			[
				{ text: "유지하기" },
				{
					text: "삭제하기",
					onPress: okDeleteAudio,
				},
			]
		);
	};

	const okDeleteAudio = async () => {
		try {
			if (audioData && audioData.id) {
				console.log(audioData.id);
				await AsyncStorage.removeItem(`audio_${audioData.id}`);
				setAudioData("");
				console.log("Audio deleted");
			} else {
				throw new Error("Invalid audio data or audio ID is missing");
			}
		} catch (error) {
			console.error("Failed to delete audio", error);
		}
	};

	/**
	 * 주제입력해주는 버튼 이벤트
	 * @param {string} text
	 */
	const btnAddSubject = (text) => {
		setDContent(dContent + text + "\n");
	};

	useEffect(() => {
		// 텍스트 길이 계산
		setContentLength(dContent.length);
		// 저장 가능한지 판단
		if (
			dContent.replace(/\s/g, "") === "" ||
			dTitle.replace(/\s/g, "") === ""
		) {
			isDark ? setCanSave(COLOR_DARK_THIRD) : setCanSave(COLOR_LIGHT_THIRD);
		} else {
			isDark ? setCanSave(COLOR_DARK_RED) : setCanSave(COLOR_LIGHT_RED);
		}
	}, [dContent, dTitle]);

	return (
		<SafeAreaView style={GlobalStyle.safeAreaWrap}>
			<KeyboardAvoidingView style={{ flex: 1 }} behavior={"padding"}>
				<Pressable onPress={Keyboard.dismiss} style={{ flex: 1 }}>
					{/* header */}
					<View style={[headerStyle.mainWrap]}>
						<Pressable
							onPress={() => {
								Alert.alert(
									"취소하시겠습니까?",
									"현재까지 작성된 내용은 저장되지 않습니다.",
									[
										{
											text: "계속 작성하기",
										},
										{
											text: "홈으로",
											onPress: () => navigation.navigate("HomeTab"),
										},
									]
								);
							}}
						>
							<Ionicons
								name="arrow-back-outline"
								size={40}
								color={isDark ? COLOR_DARK_WHITE : COLOR_BLACK}
							/>
						</Pressable>
						<View style={{ marginTop: 20 }}>
							<HeaderText headerText="Write Diary" />
						</View>
						<Pressable
							onPress={() =>
								Alert.alert(
									"저장하시겠습니까?",
									"저장하시면 더이상 수정이 불가능합니다!",
									[
										{ text: "취소" },
										{
											text: "저장",
											onPress: () => {
												handleSave();
											},
										},
									]
								)
							}
						>
							<Feather name="check" size={40} color={canSave} />
						</Pressable>
					</View>

					{/* body */}
					<ScrollView style={BodyStyle.mainWrap}>
						{
							// 일기 주제가 하나라도 있다면 실행
							dSubject !== undefined && (
								<ScrollView style={headerStyle.subjectWrap} horizontal>
									{dSubject.map((subjectElement, index) => (
										<Pressable
											style={headerStyle.subjectBox}
											key={index}
											name={subjectElement}
											onPress={() => btnAddSubject(subjectElement)}
										>
											<Text
												style={[GlobalStyle.font_body, headerStyle.subjectText]}
											>
												{subjectElement}
											</Text>
										</Pressable>
									))}
								</ScrollView>
							)
						}

						{/* 일기 제목 */}
						<View style={BodyStyle.titleInputBox}>
							<TextInput
								value={dTitle}
								onChangeText={(text) => setDTitle(text)}
								placeholder="일기에 제목을 붙여주세요"
								style={[
									BodyStyle.titleInput,
									GlobalStyle.font_title2,
									ModeColorStyle(isDark).font_DEFALUT,
								]}
							/>
						</View>

						{/* 음성녹음 버튼 */}
						<View style={BodyStyle.micWrap}>
							{audioData.id !== undefined ? (
								<Pressable onPress={deleteAudio}>
									<Ionicons
										name="close-circle"
										size={45}
										color={isDark ? COLOR_DARK_RED : COLOR_LIGHT_RED}
									/>
								</Pressable>
							) : null}
							<Pressable
								style={BodyStyle.btnMic}
								onPress={() => (recording ? stopRecording() : startRecording())}
							>
								<Ionicons
									name={recording ? "stop-circle" : "mic-circle"}
									size={45}
									color={isDark ? COLOR_DARK_RED : COLOR_LIGHT_RED}
								/>
							</Pressable>
							{audioData.id !== undefined ? (
								<Pressable onPress={playAudio}>
									<Ionicons
										name="play-circle"
										size={45}
										color={isDark ? COLOR_DARK_RED : COLOR_LIGHT_RED}
									/>
								</Pressable>
							) : null}
							<Pressable onPress={() => stopAudio()}>
								<Text>멈추기 </Text>
							</Pressable>
						</View>

						{/* 본문 textInput */}

						<TextInput
							onChangeText={(text) => setDContent(text)}
							placeholder="음성 인식 기능(녹음시작)을 활용하거나 직접 입력하여 일기를 기록해 보세요! 
            여러분의 이야기를 기록해드릴게요. 오늘은 어떤 하루였나요? :)"
							placeholderTextColor={
								isDark ? COLOR_DARK_SECONDARY : COLOR_LIGHT_SECONDARY
							}
							editable
							multiline
							textAlign="center"
							style={[
								BodyStyle.contentInput,
								GlobalStyle.font_body,
								ModeColorStyle(isDark).font_DEFALUT,
							]}
						/>

						<View style={BodyStyle.textCountWrap}>
							<Text
								style={[
									{ color: "#86878C" },
									BodyStyle.textCountText,
									GlobalStyle.font_caption2,
								]}
							>
								{contentLength}
							</Text>
						</View>
						<View
							style={{
								width: "100%",
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<Pressable style={BodyStyle.btnImg} onPress={() => pickImage()}>
								{selectedImage ? (
									<Image
										source={{ uri: selectedImage }}
										onChangePhoto={{ uri: setSelectedImage }}
										style={{ width: "100%", height: "100%" }}
									/>
								) : (
									<Image
										source={require("../../../assets/images/btnAddImg.png")}
										style={{ width: "100%", height: "100%" }}
									/>
								)}
							</Pressable>
						</View>
					</ScrollView>
				</Pressable>
			</KeyboardAvoidingView>
		</SafeAreaView>
	);
};

const headerStyle = StyleSheet.create({
	mainWrap: {
		display: "flex",
		flexDirection: "row",
		width: "100%",
		alignItems: "center",
		justifyContent: "space-between",
	},

	subjectWrap: {
		width: "100%",
		maxHeight: 35,
		marginTop: 10,
		display: "flex",
		flexDirection: "row",
		flexWrap: "nowrap",
	},
	subjectBox: {
		boxSizing: "border-box",
		backgroundColor: "#4E4981",
		paddingHorizontal: 15,
		paddingVertical: 10,
		marginHorizontal: 5,
		borderRadius: 50,
		justifyContent: "center",
	},
	subjectText: {
		color: "#fff",
	},
});

const BodyStyle = StyleSheet.create({
	mainWrap: {
		display: "flex",
		flex: 20,
	},
	titleInputBox: {
		width: "100%",
		alignItems: "center",
		marginTop: 15,
	},
	titleInput: {
		width: "70%",
		textAlign: "center",
		padding: 7,
		borderBottomWidth: 1,
		borderColor: "#86878C",
	},

	/**
	 * 음성 녹음 관련 wrap
	 */
	micWrap: {
		display: "flex",
		flexDirection: "row",
		marginTop: 10,
		alignItems: "center",
		justifyContent: "center",
	},
	btnMic: {
		alignItems: "center",
		marginHorizontal: 10,
		padding: 5,
	},

	contentInput: {
		width: "100%",
		marginTop: 5,
		minHeight: 250,
		maxHeight: 500,
	},

	textCountWrap: {
		width: "100%",
		marginTop: 15,
		justifyContent: "flex-end",
		display: "flex",
		flexDirection: "row",
	},
	textCountText: {
		textAlign: "right",
	},

	btnImg: {
		width: 250,
		height: 250,
		borderRadius: 10,
		overflow: "hidden",
		marginTop: 40,
		marginHorizontal: 10,
	},
});

export default WriteContent;
