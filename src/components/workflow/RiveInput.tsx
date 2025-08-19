import React, { useEffect, useMemo, useRef } from "react";
import * as Slider from "@radix-ui/react-slider";
import {
  useRive,
  useViewModelInstanceBoolean,
  useViewModelInstanceNumber,
  useViewModelInstanceColor,
} from "@rive-app/react-webgl2";
import { useWorkflowStore } from '@/stores/workflowStore';
import { toast } from "sonner";

const hexToRGB = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
};

const CustomSlider = ({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
}) => (
  <Slider.Root
    className="relative flex items-center select-none touch-none w-[82px] h-5"
    min={min}
    max={max}
    step={step}
    value={[value]}
    onValueChange={(val) => onChange(val[0])}
  >
    <Slider.Track className="bg-gray-700 relative grow rounded-full h-[2px]">
      <Slider.Range className="absolute bg-blue-500 h-full rounded-full" />
    </Slider.Track>
    <Slider.Thumb className="block w-3 h-3 bg-white rounded-full shadow hover:bg-gray-200 focus:outline-none" />
  </Slider.Root>
);

// Child component that owns ALL Rive view model hooks (so parent never changes hook count)
function RiveControls({
  rive,
  nodeType,
  selectedNode,
  updateNodeData,
  runwareService,
  canvasRef,
}: {
  rive: any;
  nodeType: string;
  selectedNode: any;
  updateNodeData: (id: string, data: any) => void;
  runwareService: any;
  canvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const isPose = nodeType === 'pose';
  const isLights = nodeType === 'lights';
  const isInitializedRef = useRef(false);

  // Common view model bindings
  const { value: exportVersion, setValue: setExportVersion } = useViewModelInstanceBoolean("export version", rive?.viewModelInstance);

  // Rive view model bindings for light
  const { value: editingLights, setValue: setEditingLights } = useViewModelInstanceBoolean("editing", rive?.viewModelInstance);

  // Light hooks (fixed count)
  const lightControls = [
    {
      color: useViewModelInstanceColor("color1", rive?.viewModelInstance),
      size: useViewModelInstanceNumber("size1", rive?.viewModelInstance),
      width: useViewModelInstanceNumber("width1", rive?.viewModelInstance),
      power: useViewModelInstanceNumber("power1", rive?.viewModelInstance),
      selected: useViewModelInstanceBoolean("select light 1", rive?.viewModelInstance),
      angle: useViewModelInstanceNumber("angle1", rive?.viewModelInstance),
      locationX: useViewModelInstanceNumber("location1 X", rive?.viewModelInstance),
      locationY: useViewModelInstanceNumber("location1 Y", rive?.viewModelInstance),
      added: useViewModelInstanceBoolean("add light1", rive?.viewModelInstance),
    },
    {
      color: useViewModelInstanceColor("color2", rive?.viewModelInstance),
      size: useViewModelInstanceNumber("size2", rive?.viewModelInstance),
      width: useViewModelInstanceNumber("width2", rive?.viewModelInstance),
      power: useViewModelInstanceNumber("power2", rive?.viewModelInstance),
      selected: useViewModelInstanceBoolean("select light 2", rive?.viewModelInstance),
      angle: useViewModelInstanceNumber("angle2", rive?.viewModelInstance),
      locationX: useViewModelInstanceNumber("location2 X", rive?.viewModelInstance),
      locationY: useViewModelInstanceNumber("location2 Y", rive?.viewModelInstance),
      added: useViewModelInstanceBoolean("add light2", rive?.viewModelInstance),
    },
    {
      color: useViewModelInstanceColor("color3", rive?.viewModelInstance),
      size: useViewModelInstanceNumber("size3", rive?.viewModelInstance),
      width: useViewModelInstanceNumber("width3", rive?.viewModelInstance),
      power: useViewModelInstanceNumber("power3", rive?.viewModelInstance),
      selected: useViewModelInstanceBoolean("select light 3", rive?.viewModelInstance),
      angle: useViewModelInstanceNumber("angle3", rive?.viewModelInstance),
      locationX: useViewModelInstanceNumber("location3 X", rive?.viewModelInstance),
      locationY: useViewModelInstanceNumber("location3 Y", rive?.viewModelInstance),
      added: useViewModelInstanceBoolean("add light3", rive?.viewModelInstance),
    },
    {
      color: useViewModelInstanceColor("color4", rive?.viewModelInstance),
      size: useViewModelInstanceNumber("size4", rive?.viewModelInstance),
      width: useViewModelInstanceNumber("width4", rive?.viewModelInstance),
      power: useViewModelInstanceNumber("power4", rive?.viewModelInstance),
      selected: useViewModelInstanceBoolean("select light 4", rive?.viewModelInstance),
      angle: useViewModelInstanceNumber("angle4", rive?.viewModelInstance),
      locationX: useViewModelInstanceNumber("location4 X", rive?.viewModelInstance),
      locationY: useViewModelInstanceNumber("location4 Y", rive?.viewModelInstance),
      added: useViewModelInstanceBoolean("add light4", rive?.viewModelInstance),
    },
  ];

  // Pose hooks (fixed count)
  const { value: zooming, setValue: setZooming } = useViewModelInstanceNumber("zooming", rive?.viewModelInstance);
  const { value: neck, setValue: setNeck } = useViewModelInstanceNumber("neck", rive?.viewModelInstance);
  const { value: head, setValue: setHead } = useViewModelInstanceNumber("head", rive?.viewModelInstance);
  const { value: stroke, setValue: setStroke } = useViewModelInstanceNumber("stroke", rive?.viewModelInstance);
  const { value: ballSize, setValue: setBallSize } = useViewModelInstanceNumber("ball size", rive?.viewModelInstance);
  const { value: entireLocationX, setValue: setEntireLocationX } = useViewModelInstanceNumber("entire location x", rive?.viewModelInstance);
  const { value: entireLocationY, setValue: setEntireLocationY } = useViewModelInstanceNumber("entire location y", rive?.viewModelInstance);
  const { value: shoulderLeftX, setValue: setShoulderLeftX } = useViewModelInstanceNumber("shoulder left x", rive?.viewModelInstance);
  const { value: shoulderLeftY, setValue: setShoulderLeftY } = useViewModelInstanceNumber("shoulder left y", rive?.viewModelInstance);
  const { value: shoulderRightX, setValue: setShoulderRightX } = useViewModelInstanceNumber("shoulder right x", rive?.viewModelInstance);
  const { value: shoulderRightY, setValue: setShoulderRightY } = useViewModelInstanceNumber("shoulder right y", rive?.viewModelInstance);
  const { value: elbowLeftX, setValue: setElbowLeftX } = useViewModelInstanceNumber("elbow left x", rive?.viewModelInstance);
  const { value: elbowLeftY, setValue: setElbowLeftY } = useViewModelInstanceNumber("elbow left y", rive?.viewModelInstance);
  const { value: elbowRightX, setValue: setElbowRightX } = useViewModelInstanceNumber("elbow right x", rive?.viewModelInstance);
  const { value: elbowRightY, setValue: setElbowRightY } = useViewModelInstanceNumber("elbow right y", rive?.viewModelInstance);
  const { value: handLeftX, setValue: setHandLeftX } = useViewModelInstanceNumber("hand left x", rive?.viewModelInstance);
  const { value: handLeftY, setValue: setHandLeftY } = useViewModelInstanceNumber("hand left y", rive?.viewModelInstance);
  const { value: handRightX, setValue: setHandRightX } = useViewModelInstanceNumber("hand right x", rive?.viewModelInstance);
  const { value: handRightY, setValue: setHandRightY } = useViewModelInstanceNumber("hand right y", rive?.viewModelInstance);
  const { value: waistLeftX, setValue: setWaistLeftX } = useViewModelInstanceNumber("waist left x", rive?.viewModelInstance);
  const { value: waistLeftY, setValue: setWaistLeftY } = useViewModelInstanceNumber("waist left y", rive?.viewModelInstance);
  const { value: waistRightX, setValue: setWaistRightX } = useViewModelInstanceNumber("waist right x", rive?.viewModelInstance);
  const { value: waistRightY, setValue: setWaistRightY } = useViewModelInstanceNumber("waist right y", rive?.viewModelInstance);
  const { value: kneeLeftX, setValue: setKneeLeftX } = useViewModelInstanceNumber("knee left x", rive?.viewModelInstance);
  const { value: kneeLeftY, setValue: setKneeLeftY } = useViewModelInstanceNumber("knee left y", rive?.viewModelInstance);
  const { value: kneeRightX, setValue: setKneeRightX } = useViewModelInstanceNumber("knee right x", rive?.viewModelInstance);
  const { value: kneeRightY, setValue: setKneeRightY } = useViewModelInstanceNumber("knee right y", rive?.viewModelInstance);
  const { value: footLeftX, setValue: setFootLeftX } = useViewModelInstanceNumber("foot left x", rive?.viewModelInstance);
  const { value: footLeftY, setValue: setFootLeftY } = useViewModelInstanceNumber("foot left y", rive?.viewModelInstance);
  const { value: footRightX, setValue: setFootRightX } = useViewModelInstanceNumber("foot right x", rive?.viewModelInstance);
  const { value: footRightY, setValue: setFootRightY } = useViewModelInstanceNumber("foot right y", rive?.viewModelInstance);

  const right_sidebar = (selectedNode?.data as any)?.right_sidebar || {
    lights: [
      { id: 1, size: 100, width: 100, power: 100, color: "#ffffff", angle: 0, locationX: 250, locationY: 250, selected: false },
      { id: 2, size: 100, width: 100, power: 100, color: "#ffffff", angle: 0, locationX: 250, locationY: 250, selected: false, add: false },
      { id: 3, size: 100, width: 100, power: 100, color: "#ffffff", angle: 0, locationX: 250, locationY: 250, selected: false, add: false },
      { id: 4, size: 100, width: 100, power: 100, color: "#ffffff", angle: 0, locationX: 250, locationY: 250, selected: false, add: false }
    ],
    zooming: 100,
    neck: 50,
    head: 0,
    stroke: 500,
    ball_size: 1000,
    export_version: false,
    selected: false,
    entire_location_x: 290,
    entire_location_y: 318,
    shoulder_left_x: -47.12242126464844,
    shoulder_left_y: -161.46728515625,
    shoulder_right_x: 45.875,
    shoulder_right_y: -161.46990966796875,
    elbow_left_x: -79.12069702148438,
    elbow_left_y: -51.96641540527344,
    elbow_right_x: 102.375,
    elbow_right_y: -181.46990966796875,
    hand_left_x: -67.125,
    hand_left_y: -21.96990966796875,
    hand_right_x: 106,
    hand_right_y: -244.5,
    waist_left_x: -28.625,
    waist_left_y: -12.96990966796875,
    waist_right_x: 28.375,
    waist_right_y: -12.96990966796875,
    knee_left_x: -41.125,
    knee_left_y: 90.03009033203125,
    knee_right_x: 39.875,
    knee_right_y: 90.03009033203125,
    foot_left_x: -49,
    foot_left_y: 200,
    foot_right_x: 48.375,
    foot_right_y: 200.03009033203125
  };

  const poseValuesRef = {
    zooming: (right_sidebar as any)?.zooming,
    neck: (right_sidebar as any)?.neck,
    head: (right_sidebar as any)?.head,
    stroke: (right_sidebar as any)?.stroke,
    ball_size: (right_sidebar as any)?.ball_size,
    export_version: (right_sidebar as any)?.export_version,
    entire_location_x: (right_sidebar as any)?.entire_location_x,
    entire_location_y: (right_sidebar as any)?.entire_location_y,
    shoulder_left_x: (right_sidebar as any)?.shoulder_left_x,
    shoulder_left_y: (right_sidebar as any)?.shoulder_left_y,
    shoulder_right_x: (right_sidebar as any)?.shoulder_right_x,
    shoulder_right_y: (right_sidebar as any)?.shoulder_right_y,
    elbow_left_x: (right_sidebar as any)?.elbow_left_x,
    elbow_left_y: (right_sidebar as any)?.elbow_left_y,
    elbow_right_x: (right_sidebar as any)?.elbow_right_x,
    elbow_right_y: (right_sidebar as any)?.elbow_right_y,
    hand_left_x: (right_sidebar as any)?.hand_left_x,
    hand_left_y: (right_sidebar as any)?.hand_left_y,
    hand_right_x: (right_sidebar as any)?.hand_right_x,
    hand_right_y: (right_sidebar as any)?.hand_right_y,
    waist_left_x: (right_sidebar as any)?.waist_left_x,
    waist_left_y: (right_sidebar as any)?.waist_left_y,
    waist_right_x: (right_sidebar as any)?.waist_right_x,
    waist_right_y: (right_sidebar as any)?.waist_right_y,
    knee_left_x: (right_sidebar as any)?.knee_left_x,
    knee_left_y: (right_sidebar as any)?.knee_left_y,
    knee_right_x: (right_sidebar as any)?.knee_right_x,
    knee_right_y: (right_sidebar as any)?.knee_right_y,
    foot_left_x: (right_sidebar as any)?.foot_left_x,
    foot_left_y: (right_sidebar as any)?.foot_left_y,
    foot_right_x: (right_sidebar as any)?.foot_right_x,
    foot_right_y: (right_sidebar as any)?.foot_right_y
  };

  const lightValuesRef = (i: number) => (right_sidebar as any)?.lights?.find((light: any) => light.id === i);

  const onChangeLightValue = (i: number, key: string, value: any) => {
    const updatedLights = (right_sidebar as any)?.lights?.map((light: any) => (light?.id === i ? { ...light, [key]: value } : light));

    updateNodeData(selectedNode!.id, {
      right_sidebar: {
        ...(right_sidebar as any),
        lights: updatedLights,
      },
    });
  };

  const handleDone = async () => {
    if (!canvasRef.current) {
      toast.error('Canvas not available');
      return;
    }

    if (!runwareService) {
      toast.error('Runware service not available.');
      return;
    }

    if (!selectedNode) {
      toast.error('No node selected');
      return;
    }

    try {
      const canvas = canvasRef.current;
      const dataUrl = canvas.toDataURL('image/png');

      // Update node immediately with the image data
      updateNodeData(selectedNode.id, { 
        image: dataUrl,
        imageUrl: dataUrl,
        isUploading: true 
      });

      // Convert data URL to File for upload
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'rive-capture.png', { type: 'image/png' });

      // Upload to Runware
      const imageUUID = await runwareService.uploadImage(file);
      const imageURL = await runwareService.uploadImageForURL(file);
      
      // Update with Runware data
      updateNodeData(selectedNode.id, { 
        image: imageURL,
        imageUrl: imageURL,
        imageUUID: imageUUID,
        isUploading: false 
      });

      toast.success('Image uploaded to Runware successfully!');
      console.log('Image uploaded to Runware:', { imageUUID, imageURL });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      updateNodeData(selectedNode.id, { isUploading: false });
      toast.error('Failed to upload image to Runware');
    }
  };

  // Pose sync
  useEffect(() => {
    if (!rive || !rive.viewModelInstance || !isPose) return;
    const updatedPoseValues = {
      entire_location_x: entireLocationX,
      entire_location_y: entireLocationY,
      shoulder_left_x: shoulderLeftX,
      shoulder_left_y: shoulderLeftY,
      shoulder_right_x: shoulderRightX,
      shoulder_right_y: shoulderRightY,
      elbow_left_x: elbowLeftX,
      elbow_left_y: elbowLeftY,
      elbow_right_x: elbowRightX,
      elbow_right_y: elbowRightY,
      hand_left_x: handLeftX,
      hand_left_y: handLeftY,
      hand_right_x: handRightX,
      hand_right_y: handRightY,
      waist_left_x: waistLeftX,
      waist_left_y: waistLeftY,
      waist_right_x: waistRightX,
      waist_right_y: waistRightY,
      knee_left_x: kneeLeftX,
      knee_left_y: kneeLeftY,
      knee_right_x: kneeRightX,
      knee_right_y: kneeRightY,
      foot_left_x: footLeftX,
      foot_left_y: footLeftY,
      foot_right_x: footRightX,
      foot_right_y: footRightY,
      head: head,
      zooming: zooming,
      neck: neck,
      ball_size: ballSize,
      stroke: stroke
    };

    updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, ...updatedPoseValues } });
  }, [
    isPose,
    entireLocationX, entireLocationY,
    shoulderLeftX, shoulderLeftY, shoulderRightX, shoulderRightY,
    elbowLeftX, elbowLeftY, elbowRightX, elbowRightY,
    handLeftX, handLeftY, handRightX, handRightY,
    waistLeftX, waistLeftY, waistRightX, waistRightY,
    kneeLeftX, kneeLeftY, kneeRightX, kneeRightY,
    footLeftX, footLeftY, footRightX, footRightY,
    head, zooming, neck, ballSize, stroke
  ]);

  // Lights sync
  useEffect(() => {
    if (!rive || !rive.viewModelInstance || !isLights) return;

    const newLights = right_sidebar.lights?.map((light: any, idx: number) => {
      const control = lightControls[idx];
      if (!control.selected.value) return light;
      return {
        ...light,
        selected: control.selected.value,
        power: control.power.value,
        width: control.width.value,
        angle: control.angle.value,
        locationX: control.locationX.value,
        locationY: control.locationY.value,
        ...(idx > 0 ? { add: light.add || control.added.value } : {}),
      };
    }) || [];

    const hasChanges = JSON.stringify(newLights) !== JSON.stringify(right_sidebar.lights);
    if (!hasChanges) return;

    updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, lights: newLights } });
  }, [
    isLights,
    ...lightControls.flatMap(control => [
      control.selected.value, control.power.value, control.width.value,
      control.angle.value, control.locationX.value, control.locationY.value, control.added.value
    ])
  ]);

  // Initialize on mount
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;

    if (isPose) {
      setZooming(poseValuesRef.zooming ?? 100);
      setNeck(poseValuesRef.neck ?? 50);
      setHead(poseValuesRef.head ?? 0);
      setStroke(poseValuesRef.stroke ?? 50);
      setBallSize(poseValuesRef.ball_size ?? 50);
      setExportVersion(poseValuesRef.export_version ?? false);
      setEntireLocationX(poseValuesRef.entire_location_x ?? 0);
      setEntireLocationY(poseValuesRef.entire_location_y ?? 0);
      setShoulderLeftX(poseValuesRef.shoulder_left_x ?? 0);
      setShoulderLeftY(poseValuesRef.shoulder_left_y ?? 0);
      setShoulderRightX(poseValuesRef.shoulder_right_x ?? 0);
      setShoulderRightY(poseValuesRef.shoulder_right_y ?? 0);
      setElbowLeftX(poseValuesRef.elbow_left_x ?? 0);
      setElbowLeftY(poseValuesRef.elbow_left_y ?? 0);
      setElbowRightX(poseValuesRef.elbow_right_x ?? 0);
      setElbowRightY(poseValuesRef.elbow_right_y ?? 0);
      setHandLeftX(poseValuesRef.hand_left_x ?? 0);
      setHandLeftY(poseValuesRef.hand_left_y ?? 0);
      setHandRightX(poseValuesRef.hand_right_x ?? 0);
      setHandRightY(poseValuesRef.hand_right_y ?? 0);
      setWaistLeftX(poseValuesRef.waist_left_x ?? 0);
      setWaistLeftY(poseValuesRef.waist_left_y ?? 0);
      setWaistRightX(poseValuesRef.waist_right_x ?? 0);
      setWaistRightY(poseValuesRef.waist_right_y ?? 0);
      setKneeLeftX(poseValuesRef.knee_left_x ?? 0);
      setKneeLeftY(poseValuesRef.knee_left_y ?? 0);
      setKneeRightX(poseValuesRef.knee_right_x ?? 0);
      setKneeRightY(poseValuesRef.knee_right_y ?? 0);
      setFootLeftX(poseValuesRef.foot_left_x ?? 0);
      setFootLeftY(poseValuesRef.foot_left_y ?? 0);
      setFootRightX(poseValuesRef.foot_right_x ?? 0);
      setFootRightY(poseValuesRef.foot_right_y ?? 0);
    }

    if (isLights) {
      setEditingLights(true);

      for (let i = 1; i <= 4; i++) {
        const lightRef = lightValuesRef(i);
        if (!lightRef) continue;
        const control = lightControls[i - 1];
        control.selected.setValue(false);
        control.size.setValue(lightRef.size ?? 100);
        control.width.setValue(lightRef.width ?? 100);
        control.power.setValue(lightRef.power ?? 100);
        const { r, g, b } = hexToRGB((lightRef.color ?? "#ffffff").toString());
        control.color.setRgb(r, g, b);
        control.angle.setValue(lightRef.angle ?? 0);
        control.locationX.setValue(lightRef.locationX ?? 250);
        control.locationY.setValue(lightRef.locationY ?? 250);
      }

      for(let i = 2; i <=4; i++){
        const lightRef = lightValuesRef(i)
        if(!lightRef) continue;
        lightControls[i-1].added.setValue(lightRef.add ?? false)
      }
    }

    isInitializedRef.current = true;
  }, [rive, isPose, isLights]);

  // Done actions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isInitializedRef.current || !isLights) return;

    if (editingLights === false) {
      for(let i=0; i<4; i++) lightControls[i].selected.setValue(false);
      setExportVersion(true);
      const t = setTimeout(() => { handleDone(); setExportVersion(false); }, 100);
      return () => clearTimeout(t);
    }

    if (editingLights === true) setExportVersion(false);
  }, [editingLights, isLights]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedNode || !isPose) return;
    if (exportVersion === true) {
      const t = setTimeout(() => { handleDone(); setExportVersion(false); }, 100);
      return () => clearTimeout(t);
    }
  }, [exportVersion, selectedNode, isPose]);

  // UI
  return (
    <>
      {isPose && (
        <div className="text-white text-sm space-y-4 mt-4">
          {[
            { label: "Export Version", type: "checkbox", value: poseValuesRef?.export_version ?? false, onChange: (val: boolean) => {
              setExportVersion(val);
              updateNodeData(selectedNode.id, { right_sidebar: { ...right_sidebar, export_version: val } });
            }},
            { label: "Zooming", type: "slider", value: poseValuesRef.zooming ?? 100, set: setZooming, key: "zooming" },
            { label: "Neck", type: "slider", value: poseValuesRef.neck ?? 50, set: setNeck, key: "neck" },
            { label: "Head", type: "slider", value: poseValuesRef.head ?? 0, set: setHead, key: "head" },
          ].map((item, idx) => (
            <div key={idx} className="mb-4 flex items-center justify-between w-full">
              <label className="text-md text-[#9e9e9e]">{item.label}</label>
              {item.type === "checkbox" ? (
                <input type="checkbox" checked={item.value} onChange={(e) => item.onChange!(e.target.checked)} />
              ) : (
                <div className="flex items-center">
                  <input
                    value={`${item.value}%`}
                    type="text"
                    className="mr-2 text-sm text-center w-[60px] h-[30px] rounded-full bg-[#191919] border border-[#2a2a2a]"
                    readOnly
                  />
                  <CustomSlider
                    value={item.value}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(val) => {
                      item.set!(val);
                      updateNodeData(selectedNode.id, {
                        right_sidebar: {
                          ...right_sidebar,
                          [item.key!]: val,
                        },
                      });
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isLights && (
        <div className="text-white text-sm space-y-4 mt-4">
          <div className="mb-4 flex items-center justify-between w-full">
            <label className="text-md text-[#9e9e9e]">Export Version</label>
            <input
              type="checkbox"
              checked={right_sidebar?.export_version ?? false}
              onChange={(e) => {
                setExportVersion(e.target.checked);
                updateNodeData(selectedNode.id, {
                  right_sidebar: {
                    ...right_sidebar,
                    export_version: e.target.checked,
                  },
                });
              }}
            />
          </div>

          {(() => {
            const selectedIndex = lightControls.findIndex(control => control.selected.value);
            const ref = lightValuesRef(selectedIndex !== -1 ? selectedIndex + 1 : 1);
            const control = lightControls[selectedIndex] || lightControls[0];

            return (
              <div className="p-2 border border-gray-700 rounded-lg">
                <div className="mb-4 text-[#9e9e9e] text-md font-medium">
                  Editing Light {selectedIndex !== -1 ? selectedIndex + 1 : "(none selected)"}
                </div>

                {["size", "width", "power"].map((key) => (
                  <div key={key} className="mb-4 flex items-center justify-between w-full">
                    <label className="text-md text-[#9e9e9e] capitalize">{key}</label>
                    <div className="flex items-center">
                      <input
                        value={`${ref?.[key] ?? 100}%`}
                        type="text"
                        readOnly
                        className="mr-2 text-sm text-center w-[60px] h-[30px] rounded-full bg-[#191919] border border-[#2a2a2a]"
                      />
                      <CustomSlider
                        value={ref?.[key] ?? 100}
                        min={0}
                        max={100}
                        step={1}
                        onChange={(val) => {
                          if (selectedIndex === -1) return;
                          const controlKey = key as keyof typeof control;
                          if (controlKey in control && 'setValue' in (control as any)[controlKey]) {
                            (control as any)[controlKey].setValue(val);
                          }
                          onChangeLightValue(selectedIndex + 1, key, val);
                        }}
                      />
                    </div>
                  </div>
                ))}

                <div className="mb-4 flex items-center justify-between w-full">
                  <label className="text-md text-[#9e9e9e]">Color</label>
                  <input
                    type="color"
                    value={ref?.color ?? "#ffffff"}
                    onChange={(e) => {
                      if (selectedIndex === -1) return;
                      const { r, g, b } = hexToRGB(e.target.value);
                      control.color.setRgb(r, g, b);
                      onChangeLightValue(selectedIndex + 1, "color", e.target.value);
                    }}
                    className="w-[30px] h-[30px] p-0 border-none bg-transparent rounded-full"
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </>
  );
}

export const RiveInput: React.FC<{ nodeType: string }> = ({ nodeType }) => {
  const { nodes, updateNodeData, runwareService, selectedNodeId } = useWorkflowStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const selectedNode = nodes.find(node => node.id === selectedNodeId);

  // Determine whether to show controls
  const shouldRender = useMemo(() => {
    if (!selectedNode) return false;
    const isPoseNode = nodeType === 'pose' && selectedNode.type === 'controlNet' && selectedNode.data?.preprocessor === 'openpose';
    const isLightNode = nodeType === 'lights' && (selectedNode.type?.includes('light') || (typeof selectedNode.data?.label === 'string' && selectedNode.data.label.toLowerCase().includes('light')));
    return isPoseNode || isLightNode;
  }, [selectedNode, nodeType]);

  const rivePath = nodeType === 'pose' ? '/pose.riv' : nodeType === 'lights' ? '/lights.riv' : '';
  const artboard = nodeType === 'lights' ? 'Artboard' : 'final for nover';

  // Parent always calls useRive (stable hook count)
  const { rive, RiveComponent } = useRive({
    src: rivePath,
    autoplay: shouldRender,
    artboard,
    autoBind: shouldRender,
    stateMachines: 'State Machine 1',
  });

  // Capture canvas for child to use
  useEffect(() => {
    if (!rive) return;
    const riveCanvas = (rive as any).canvas as HTMLCanvasElement;
    if (riveCanvas) canvasRef.current = riveCanvas;
  }, [rive]);

  return (
    <div className="mb-4">
      <div className="w-[235px] h-[235px] border-2 border-[#1e1e1e] overflow-hidden rounded-2xl">
        <RiveComponent className="w-full h-full block" />
      </div>

      {shouldRender && selectedNode && rive?.viewModelInstance && (
        <RiveControls
          rive={rive}
          nodeType={nodeType}
          selectedNode={selectedNode}
          updateNodeData={updateNodeData}
          runwareService={runwareService}
          canvasRef={canvasRef}
        />
      )}
    </div>
  );
};

export default RiveInput;
