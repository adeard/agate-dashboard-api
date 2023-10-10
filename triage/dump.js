// for (let i = 0; i < body.rules.length; i++) {
//   const acc = body.rules[i];
//   const accConditions = acc.conditions;
//   const accActions = acc.actions;

const dayjs = require('dayjs');

//   await (async () => {
//     try {
//       payloadRule = {
//         device: deviceId,
//         order: acc.order,
//         name: acc.name,
//         is_all_day: acc.is_all_day,
//         time_from: acc.time_from || null,
//         time_to: acc.time_to || null,
//       };
//       const createdRule = await DeviceRulesModel.create(payloadRule);

//       for (let j = 0; j < accConditions.length; j++) {
//         const cAcc = accConditions[j];
//         payloadCondition = {
//           device_rule: createdRule._id,
//           order: cAcc.order,
//           indicator: cAcc.indicator,
//           math_indicator: cAcc.math_indicator,
//           value: cAcc.value,
//           next_condition: cAcc.next_condition,
//         };

//         await DeviceRuleConditionModel.create(payloadCondition);
//       }

//       for (let k = 0; k < accActions.length; k++) {
//         const aAcc = accActions[k];
//         payloadAction = {
//           device_rule: createdRule._id,
//           order: aAcc.order,
//           action: aAcc.action,
//           device_pin: aAcc.device_pin,
//           value: aAcc.value,
//         };
//         await DeviceRuleActionModel.create(payloadAction);

//         const payloadLogAction = {
//           device: founded._id,
//           greenhouse: founded.greenhouse,
//           date: new Date(),
//           notes: `${user.full_name} has updated action ${acc.name}`,
//         };
//         await DeviceActionLogModel.create(payloadLogAction);
//       }

//       const payloadLogSetting = {
//         device: founded._id,
//         greenhouse: founded.greenhouse,
//         date: new Date(),
//         notes: `${user.full_name} has updated ${acc.name} settings`,
//       };
//       await DeviceSettingLogModel.create(payloadLogSetting);
//     } catch (err) {
//       throw err;
//     }
//   })();
// }
