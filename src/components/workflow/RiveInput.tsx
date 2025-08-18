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

const colorNumberToHexString = (colorNum: number | null) => {
  if (colorNum === null) return "#ffffff";
  const r = (colorNum >> 16) & 0xff;
  const g = (colorNum >> 8) & 0xff;
  const b = colorNum & 0xff;
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
};

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
}) => {
  return (
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
};

export const RiveInput: React.FC<{ nodeType: string }> = ({ nodeType }) => {
  const { nodes, updateNodeData, runwareService, selectedNodeId } = useWorkflowStore();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Find the selected node based on selectedNodeId
  const selectedNode = nodes.find(node => node.id === selectedNodeId);
  
  if (!selectedNode) return null;
  
  // Check if the current node type matches the nodeType prop for specific cases
  const isPoseNode = nodeType === 'pose' && selectedNode.type === 'controlNet' && selectedNode.data?.preprocessor === 'openpose';
  const isLightNode = nodeType === 'lights' && (selectedNode.type?.includes('light') || (typeof selectedNode.data?.label === 'string' && selectedNode.data.label.toLowerCase().includes('light')));
  
  if (!isPoseNode && !isLightNode) return null;

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
    stroke: 50,
    ball_size: 50,
    export_version: false
  };

  const poseValuesRef = {
    zooming: (right_sidebar as any)?.zooming,
    neck: (right_sidebar as any)?.neck,
    head: (right_sidebar as any)?.head,
    stroke: (right_sidebar as any)?.stroke,
    ball_size: (right_sidebar as any)?.ball_size,
    export_version: (right_sidebar as any)?.export_version,

    // Entire location
    entire_location_x: (right_sidebar as any)?.entire_location_x,
    entire_location_y: (right_sidebar as any)?.entire_location_y,

    // Shoulders
    shoulder_left_x: (right_sidebar as any)?.shoulder_left_x,
    shoulder_left_y: (right_sidebar as any)?.shoulder_left_y,
    shoulder_right_x: (right_sidebar as any)?.shoulder_right_x,
    shoulder_right_y: (right_sidebar as any)?.shoulder_right_y,

    // Elbows
    elbow_left_x: (right_sidebar as any)?.elbow_left_x,
    elbow_left_y: (right_sidebar as any)?.elbow_left_y,
    elbow_right_x: (right_sidebar as any)?.elbow_right_x,
    elbow_right_y: (right_sidebar as any)?.elbow_right_y,

    // Hands
    hand_left_x: (right_sidebar as any)?.hand_left_x,
    hand_left_y: (right_sidebar as any)?.hand_left_y,
    hand_right_x: (right_sidebar as any)?.hand_right_x,
    hand_right_y: (right_sidebar as any)?.hand_right_y,

    // Waist
    waist_left_x: (right_sidebar as any)?.waist_left_x,
    waist_left_y: (right_sidebar as any)?.waist_left_y,
    waist_right_x: (right_sidebar as any)?.waist_right_x,
    waist_right_y: (right_sidebar as any)?.waist_right_y,

    // Knees
    knee_left_x: (right_sidebar as any)?.knee_left_x,
    knee_left_y: (right_sidebar as any)?.knee_left_y,
    knee_right_x: (right_sidebar as any)?.knee_right_x,
    knee_right_y: (right_sidebar as any)?.knee_right_y,

    // Feet
    foot_left_x: (right_sidebar as any)?.foot_left_x,
    foot_left_y: (right_sidebar as any)?.foot_left_y,
    foot_right_x: (right_sidebar as any)?.foot_right_x,
    foot_right_y: (right_sidebar as any)?.foot_right_y
  };

  const lightValuesRef = (i: number) => {
    return (right_sidebar as any)?.lights?.find((light: any) => light.id === i);
  };

  const onChangeLightValue = (i: number, key: string, value: any) => {
    const updatedLights = (right_sidebar as any)?.lights?.map((light: any) => {
      if (light?.id === i) {
        return {
          ...light,
          [key]: value
        };
      }
      return light;
    });

    updateNodeData(selectedNode!.id, {
      right_sidebar: {
        ...(right_sidebar as any),
        lights: updatedLights,
      },
    });
  };

  const rivePath = nodeType.includes("pose")
    ? "/pose.riv"
    : nodeType.includes("lights")
    ? "/lights.riv"
    : null;
    
  const artboard = nodeType.includes("lights") ? "Artboard" : "final for nover";

  const isPose = isPoseNode;
  const isLights = isLightNode;
  
  const { rive, RiveComponent } = useRive({
    src: rivePath || "",
    autoplay: true,
    artboard,
    autoBind: true,
    stateMachines: "State Machine 1",
  });

  // Common view model bindings
  const { value: exportVersion, setValue: setExportVersion } = useViewModelInstanceBoolean("export version", rive?.viewModelInstance);

  // Rive view model bindings for light
  const { value: editingLights, setValue: setEditingLights } = useViewModelInstanceBoolean("editing", rive?.viewModelInstance);

  const lightControls = (i: number) => {
    const { value: color, setValue: setColor, setRgb } = useViewModelInstanceColor(`color${i}`, rive?.viewModelInstance);
    const { value: size, setValue: setSize } = useViewModelInstanceNumber(`size${i}`, rive?.viewModelInstance);
    const { value: width, setValue: setWidth } = useViewModelInstanceNumber(`width${i}`, rive?.viewModelInstance);
    const { value: power, setValue: setPower } = useViewModelInstanceNumber(`power${i}`, rive?.viewModelInstance);
    const { value: selected, setValue: setSelected } = useViewModelInstanceBoolean(`select light ${i}`, rive?.viewModelInstance);
    const { value: angle, setValue: setAngle } = useViewModelInstanceNumber(`angle${i}`, rive?.viewModelInstance);
    const { value: lightLocationX, setValue: setLightLocationX } = useViewModelInstanceNumber(`location${i} X`, rive?.viewModelInstance); 
    const { value: lightLocationY, setValue: setLightLocationY } = useViewModelInstanceNumber(`location${i} Y`, rive?.viewModelInstance);
    const { value: lightAdded, setValue: setLightAdded } = useViewModelInstanceBoolean(`add light${i}`, rive?.viewModelInstance);

    return {
      lightGetters: { color, size, width, power, selected, angle, lightLocationX, lightLocationY, lightAdded },
      lightSetters: { setRgb, setColor, setSize, setWidth, setPower, setSelected, setAngle, setLightLocationX, setLightLocationY, setLightAdded }
    };
  };

  // Initial values
  const lights = [
    lightControls(1),
    lightControls(2),
    lightControls(3),
    lightControls(4),
  ];

  // Rive view model bindings for pose
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

  //when rive pose changes, update the right sidebar
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;
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

    updateNodeData(selectedNode.id, {
      right_sidebar: {
        ...right_sidebar,
        ...updatedPoseValues
      },
    });
  }, [
    entireLocationX, entireLocationY,
    shoulderLeftX, shoulderLeftY, shoulderRightX, shoulderRightY,
    elbowLeftX, elbowLeftY, elbowRightX, elbowRightY,
    handLeftX, handLeftY, handRightX, handRightY,
    waistLeftX, waistLeftY, waistRightX, waistRightY,
    kneeLeftX, kneeLeftY, kneeRightX, kneeRightY,
    footLeftX, footLeftY, footRightX, footRightY,
    head, zooming, neck, ballSize, stroke
  ]);

  //when rive light changes, update the right sidebar
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;

    const newLights = right_sidebar.lights?.map((light: any, idx: number) => {
      const g = lights[idx].lightGetters;

      if (!g.selected) {
        return light; // skip update; preserve as-is
      }

      return {
        ...light,
        selected: g.selected,
        power: g.power,
        width: g.width,
        angle: g.angle,
        locationX: g.lightLocationX,
        locationY: g.lightLocationY,
        ...(idx > 0 ? { add: light.add || g.lightAdded } : {}), // Only lights 2–4 have `add`
      };
    }) || [];

    // Prevent unnecessary updates
    const hasChanges = JSON.stringify(newLights) !== JSON.stringify(right_sidebar.lights);
    if (!hasChanges) return;

    updateNodeData(selectedNode.id, {
      right_sidebar: {
        ...right_sidebar,
        lights: newLights,
      },
    });
  }, [
    lights[0].lightGetters.selected, lights[0].lightGetters.power, lights[0].lightGetters.width, lights[0].lightGetters.angle, lights[0].lightGetters.lightLocationX, lights[0].lightGetters.lightLocationY,
    lights[1].lightGetters.selected, lights[1].lightGetters.power, lights[1].lightGetters.width, lights[1].lightGetters.angle, lights[1].lightGetters.lightLocationX, lights[1].lightGetters.lightLocationY, lights[1].lightGetters.lightAdded,
    lights[2].lightGetters.selected, lights[2].lightGetters.power, lights[2].lightGetters.width, lights[2].lightGetters.angle, lights[2].lightGetters.lightLocationX, lights[2].lightGetters.lightLocationY, lights[2].lightGetters.lightAdded,
    lights[3].lightGetters.selected, lights[3].lightGetters.power, lights[3].lightGetters.width, lights[3].lightGetters.angle, lights[3].lightGetters.lightLocationX, lights[3].lightGetters.lightLocationY, lights[3].lightGetters.lightAdded,
  ]);

  //initialize values for pose and light upon rendering/node select 
  useEffect(() => {
    if (!rive || !rive.viewModelInstance) return;

    if (isPose) {
      setZooming(poseValuesRef.zooming);
      setNeck(poseValuesRef.neck);
      setHead(poseValuesRef.head);
      setStroke(poseValuesRef.stroke);
      setBallSize(poseValuesRef.ball_size);
      setExportVersion(poseValuesRef.export_version);

      setEntireLocationX(poseValuesRef.entire_location_x);
      setEntireLocationY(poseValuesRef.entire_location_y);

      setShoulderLeftX(poseValuesRef.shoulder_left_x);
      setShoulderLeftY(poseValuesRef.shoulder_left_y);
      setShoulderRightX(poseValuesRef.shoulder_right_x);
      setShoulderRightY(poseValuesRef.shoulder_right_y);

      setElbowLeftX(poseValuesRef.elbow_left_x);
      setElbowLeftY(poseValuesRef.elbow_left_y);
      setElbowRightX(poseValuesRef.elbow_right_x);
      setElbowRightY(poseValuesRef.elbow_right_y);

      setHandLeftX(poseValuesRef.hand_left_x);
      setHandLeftY(poseValuesRef.hand_left_y);
      setHandRightX(poseValuesRef.hand_right_x);
      setHandRightY(poseValuesRef.hand_right_y);

      setWaistLeftX(poseValuesRef.waist_left_x);
      setWaistLeftY(poseValuesRef.waist_left_y);
      setWaistRightX(poseValuesRef.waist_right_x);
      setWaistRightY(poseValuesRef.waist_right_y);

      setKneeLeftX(poseValuesRef.knee_left_x);
      setKneeLeftY(poseValuesRef.knee_left_y);
      setKneeRightX(poseValuesRef.knee_right_x);
      setKneeRightY(poseValuesRef.knee_right_y);

      setFootLeftX(poseValuesRef.foot_left_x);
      setFootLeftY(poseValuesRef.foot_left_y);
      setFootRightX(poseValuesRef.foot_right_x);
      setFootRightY(poseValuesRef.foot_right_y);
    }

    if (isLights) {
      setEditingLights(true);

      for (let i = 1; i <= 4; i++) {
        const lightRef = lightValuesRef(i);
        if (!lightRef) continue;

        lights[i - 1].lightSetters.setSelected(false);
        lights[i - 1].lightSetters.setSize(lightRef.size ?? 100);
        lights[i - 1].lightSetters.setWidth(lightRef.width ?? 100);
        lights[i - 1].lightSetters.setPower(lightRef.power ?? 100);

        const { r, g, b } = hexToRGB((lightRef.color ?? "#ffffff").toString());
        lights[i - 1].lightSetters.setRgb(r, g, b);

        lights[i - 1].lightSetters.setAngle(lightRef.angle ?? 0);
        lights[i - 1].lightSetters.setLightLocationX(lightRef.locationX ?? 250);
        lights[i - 1].lightSetters.setLightLocationY(lightRef.locationY ?? 250);
      }

      for(let i = 2; i <=4; i++){
        const lightRef = lightValuesRef(i)
        if(!lightRef) return;
        lights[i-1].lightSetters.setLightAdded(lightRef.add ?? false)
      }
    }
  }, [rive]);

  useEffect(() => {
    if (!rive) return;
    // Get canvas from rive instance
    const riveCanvas = (rive as any).canvas as HTMLCanvasElement;
    if (riveCanvas) {
      canvasRef.current = riveCanvas;
    }
  }, [rive]);

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

      // Convert data URL to blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], 'rive-image.png', { type: 'image/png' });

      // Upload to Runware
      const imageURL = await runwareService.uploadImageForURL(file);
      
      // Update with Runware data
      updateNodeData(selectedNode.id, { 
        image: imageURL,
        imageUrl: imageURL,
        isUploading: false 
      });

      toast.success('Image uploaded to Runware successfully!');
      console.log('Image uploaded to Runware:', { imageURL });
      
    } catch (error) {
      console.error('Error uploading image:', error);
      updateNodeData(selectedNode.id, { isUploading: false });
      toast.error('Failed to upload image to Runware');
    }
  };

  //when click done in lights, set export version to true and download image
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // User done editing
    if (editingLights === false) {
      
       for(let i=1; i<=4; i++){
        lights[i-1].lightSetters.setSelected(false)
      }

      setExportVersion(true);
      const timer = setTimeout(() => {
        handleDone();
        setExportVersion(false);
      }, 100);

      return () => clearTimeout(timer); // Cleanup
    }

    if (editingLights === true) {
      setExportVersion(false);
    }
  }, [editingLights]);

  //when export version is true, upload screenshot for pose
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedNode) return;

    if (exportVersion === true && isPose) {
      const timer = setTimeout(() => {
        handleDone();
        setExportVersion(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [exportVersion, selectedNode, isPose]);

  if (!rivePath || !selectedNode) return null;

  return (
    <div className="mb-4">
      <div className="w-[235px] h-[235px] border-2 border-[#1e1e1e] overflow-hidden rounded-2xl">
        <RiveComponent className="w-full h-full block" />
      </div>

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
            const selectedIndex = [0, 1, 2, 3].find(i => lights[i].lightGetters.selected);
            const ref = lightValuesRef(selectedIndex !== undefined ? selectedIndex + 1 : 1); // default to 1-based ID
            const lightSetters = lights[selectedIndex ?? 0].lightSetters;

            return (
              <div className="p-2 border border-gray-700 rounded-lg">
                <div className="mb-4 text-[#9e9e9e] text-md font-medium">
                  Editing Light {selectedIndex !== undefined ? selectedIndex + 1 : "(none selected)"}
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
                          if (selectedIndex === undefined) return;
                          const setter = lightSetters[`set${key.charAt(0).toUpperCase() + key.slice(1)}` as keyof typeof lightSetters] as (val: number) => void;
                          setter(val);
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
                      if (selectedIndex === undefined) return;
                      const { r, g, b } = hexToRGB(e.target.value);
                      lightSetters.setRgb(r, g, b);
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
    </div>
  );
};

export default RiveInput;