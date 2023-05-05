import { Alert } from "react-native";
import React, {useState, useEffect, useCallback} from "react";
import LoginScreen from "./src/pages/login/Login";
import FindPWScreen from "./src/pages/login/FindPW";
import SignUpScreen from "./src/pages/login/SignUp";
import WriteScreen from "./src/pages/Write";
import HomeScreen from "./src/pages/Home";
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import Tabs from './src/components/tabs'
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from './firebase';

export default function App() {

  const [fontsLoaded] = useFonts({
    'Diary': require('./assets/fonts/EF_Diary.ttf'),
  });

	const Stack = createNativeStackNavigator();
  const [islogin, setIsLogin] = useState(false);


  const checkLogin = () => {
    onAuthStateChanged(auth, (user) => {
      if (user){
        setIsLogin(true);
        Alert.alert('로그인 성공!')
      }
      else{
        setIsLogin(false);
        Alert.alert('로그아웃!!')
      }
    })
  }
  checkLogin();
  useEffect(() => {
    checkLogin
  }, [islogin]);

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  if(islogin){
    return(
      <NavigationContainer onLayout={onLayoutRootView}>
        <Stack.Navigator>
          <Stack.Screen name="HomeTab" component={Tabs}
            options={{headerShown: false}}
          />
          <Stack.Screen name="Write" component={WriteScreen}
          options={{headerShown: false}}/>
        </Stack.Navigator>
      </NavigationContainer>
    )
  }
  return(
    <NavigationContainer onLayout={onLayoutRootView}>
      <Stack.Navigator>
        {/* 로그인 화면 */}
        <Stack.Screen name="Login" component={LoginScreen} 
        options={{headerShown: false}}/>
        {/* 회원가입 화면 */}
        <Stack.Screen name="SignUp" component={SignUpScreen} 
        options={{headerStyle: {backgroundColor:'rgba(0,0,0,0)'}, headerTitle:""}}/>
        {/* 비밀번호 변경 화면 */}
        <Stack.Screen name="FindPW" component={FindPWScreen}
        options={{headerStyle: {backgroundColor:'rgba(0,0,0,0)'}, headerTitle:""}}/>
      </Stack.Navigator>
    </NavigationContainer>

  )
}