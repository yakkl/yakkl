<!-- LoginFlowConfigured.svelte - Configured wrapper for LoginFlow with social auth settings -->
<script lang="ts">
  import LoginFlow from '@yakkl/security-ui/LoginFlow.svelte';

  interface Props {
    onSuccess: (profile: any, digest: string, isMinimal: boolean, jwtToken?: string) => void;
    onError: (error: any) => void;
    onCancel: () => void;
    onSocialAuth?: (provider: 'google' | 'x', authResult: any) => Promise<void>;
    deps?: any;
    config?: any;
    showSocialOptions?: boolean;
    planLevel?: string;
  }

  let {
    onSuccess,
    onError,
    onCancel,
    onSocialAuth,
    deps = {},
    config = {},
    showSocialOptions = true,
    planLevel = 'explorer_member'
  }: Props = $props();

  // Get OAuth client IDs from environment variables
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const xClientId = import.meta.env.VITE_X_CLIENT_ID || import.meta.env.VITE_TWITTER_CLIENT_ID || '';

  // Merge social auth configuration into config
  const configWithSocial = {
    ...config,
    googleClientId,
    xClientId
  };
</script>

<!-- Pass through to LoginFlow with configured social auth -->
<LoginFlow
  {onSuccess}
  {onError}
  {onCancel}
  {onSocialAuth}
  {deps}
  config={configWithSocial}
  {showSocialOptions}
  {planLevel}
/>