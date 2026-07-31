<template>
  <el-tag :type="tagType" size="small" effect="light">{{ label }}</el-tag>
</template>

<script setup>
import { computed } from 'vue';
import { getStatusLabel, getStatusType } from '../utils/constants';

const props = defineProps({
  type: { type: String, required: true }, // delivery / payment / invoice
  value: { type: String, required: true },
});

const label = computed(() => getStatusLabel(props.type, props.value));
const tagType = computed(() => getStatusType(props.type, props.value));
</script>
