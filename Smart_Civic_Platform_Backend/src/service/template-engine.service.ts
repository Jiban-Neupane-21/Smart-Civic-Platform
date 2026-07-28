import { SupabaseClient } from "@supabase/supabase-js";

export class TemplateEngineService {
  constructor(private supabaseAdmin: SupabaseClient) {}

  /**
   * Render template string by substituting {{variable}} placeholders
   */
  renderTemplate(templateStr: string, variables: Record<string, any>): string {
    return templateStr.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      return variables[key] !== undefined && variables[key] !== null
        ? String(variables[key])
        : "";
    });
  }

  /**
   * Fetch active template by trigger event name and render title & body
   */
  async renderFromTriggerEvent(
    triggerEvent: string,
    variables: Record<string, any>,
    fallbackTitle: string,
    fallbackBody: string
  ): Promise<{ title: string; body: string; channels?: string[] }> {
    const { data: template } = await this.supabaseAdmin
      .from("notification_templates")
      .select("title_template, body_template, channels")
      .eq("trigger_event", triggerEvent)
      .eq("is_active", true)
      .maybeSingle();

    if (!template) {
      return {
        title: this.renderTemplate(fallbackTitle, variables),
        body: this.renderTemplate(fallbackBody, variables),
      };
    }

    return {
      title: this.renderTemplate(template.title_template, variables),
      body: this.renderTemplate(template.body_template, variables),
      channels: template.channels,
    };
  }
}
