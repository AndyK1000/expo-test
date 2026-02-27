import { supabase } from "@/lib/supabase";
import { DeviceMotion } from "expo-sensors";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const CHUNK_SIZE = 100;

type MotionRow = {
  accel_x: number;
  accel_y: number;
  accel_z: number;
  accel_timestamp: number;
  accel_wg_x: number;
  accel_wg_y: number;
  accel_wg_z: number;
  accel_wg_timestamp: number;
  rot_alpha: number;
  rot_beta: number;
  rot_gama: number;
  rot_timestamp: number;
  orientation: number;
};

export default function DeviceMotionScreen() {
  const [isRecording, setIsRecording] = useState(false);
  const [latest, setLatest] = useState<MotionRow | null>(null);
  const bufferRef = useRef<MotionRow[]>([]);
  const subRef = useRef<ReturnType<typeof DeviceMotion.addListener> | null>(
    null,
  );

  async function flush(force = false) {
    if (!force && bufferRef.current.length < CHUNK_SIZE) return;
    if (bufferRef.current.length === 0) return;
    const rows = bufferRef.current.splice(0, bufferRef.current.length);
    const { error } = await supabase.from("device_motion").insert(rows);
    if (error) console.error(error);
  }

  function subscribe() {
    DeviceMotion.setUpdateInterval(16);
    subRef.current = DeviceMotion.addListener((e) => {
      const now = Date.now();
      const row: MotionRow = {
        accel_x: e.acceleration?.x ?? 0,
        accel_y: e.acceleration?.y ?? 0,
        accel_z: e.acceleration?.z ?? 0,
        accel_timestamp: e.acceleration?.timestamp ?? now,
        accel_wg_x: e.accelerationIncludingGravity?.x ?? 0,
        accel_wg_y: e.accelerationIncludingGravity?.y ?? 0,
        accel_wg_z: e.accelerationIncludingGravity?.z ?? 0,
        accel_wg_timestamp: e.accelerationIncludingGravity?.timestamp ?? now,
        rot_alpha: e.rotation?.alpha ?? 0,
        rot_beta: e.rotation?.beta ?? 0,
        rot_gama: e.rotation?.gamma ?? 0,
        rot_timestamp: e.rotation?.timestamp ?? now,
        orientation: e.orientation ?? 0,
      };
      bufferRef.current.push(row);
      setLatest(row);
      flush();
    });
    setIsRecording(true);
  }

  function unsubscribe() {
    subRef.current?.remove();
    subRef.current = null;
    flush(true);
    setIsRecording(false);
  }

  useEffect(() => {
    subscribe();
    return () => unsubscribe();
  }, []);

  const _slow = () => DeviceMotion.setUpdateInterval(1000);
  const _fast = () => DeviceMotion.setUpdateInterval(16);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Acceleration (no gravity)</Text>
      <Text style={styles.unit}>(m/s²)</Text>
      <Text style={styles.text}>x: {latest?.accel_x.toFixed(4) ?? "—"}</Text>
      <Text style={styles.text}>y: {latest?.accel_y.toFixed(4) ?? "—"}</Text>
      <Text style={styles.text}>z: {latest?.accel_z.toFixed(4) ?? "—"}</Text>

      <Text style={[styles.header, styles.gap]}>
        Acceleration (with gravity)
      </Text>
      <Text style={styles.unit}>(m/s²)</Text>
      <Text style={styles.text}>x: {latest?.accel_wg_x.toFixed(4) ?? "—"}</Text>
      <Text style={styles.text}>y: {latest?.accel_wg_y.toFixed(4) ?? "—"}</Text>
      <Text style={styles.text}>z: {latest?.accel_wg_z.toFixed(4) ?? "—"}</Text>

      <Text style={[styles.header, styles.gap]}>Rotation</Text>
      <Text style={styles.unit}>(rad)</Text>
      <Text style={styles.text}>α: {latest?.rot_alpha.toFixed(4) ?? "—"}</Text>
      <Text style={styles.text}>β: {latest?.rot_beta.toFixed(4) ?? "—"}</Text>
      <Text style={styles.text}>γ: {latest?.rot_gama.toFixed(4) ?? "—"}</Text>

      <Text style={[styles.header, styles.gap]}>Orientation</Text>
      <Text style={styles.text}>{latest?.orientation ?? "—"}°</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={isRecording ? unsubscribe : subscribe}
          style={styles.button}
        >
          <Text>{isRecording ? "On" : "Off"}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={_slow}
          style={[styles.button, styles.middleButton]}
        >
          <Text>Slow</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={_fast} style={styles.button}>
          <Text>Fast</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 20 },
  header: { textAlign: "center", fontWeight: "600", fontSize: 16 },
  unit: { textAlign: "center", fontSize: 12, color: "#888", marginBottom: 4 },
  gap: { marginTop: 24 },
  text: { textAlign: "center" },
  buttonContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 24,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#eee",
    padding: 10,
  },
  middleButton: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "#ccc",
  },
});
