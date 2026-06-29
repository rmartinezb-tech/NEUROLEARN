import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { file_url, json_schema } = await req.json()

    // Download the file
    const fileResponse = await fetch(file_url)
    if (!fileResponse.ok) {
      throw new Error('Could not download file from storage')
    }

    // Read as text (works for .txt, .md, .csv; PDFs will be raw bytes)
    const fileText = await fileResponse.text()

    // Trim to avoid huge token counts (Groq has context limits)
    const truncated = fileText.slice(0, 12000)

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: `You extract structured data from documents. Respond ONLY with valid JSON matching this schema: ${JSON.stringify(json_schema)}. No markdown, no explanation.`,
          },
          {
            role: 'user',
            content: `Extract all the questions and information from this document text:\n\n${truncated}`,
          },
        ],
        max_tokens: 4096,
        temperature: 0.2,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error?.message || 'Groq API error')
    }

    const text = data.choices?.[0]?.message?.content ?? ''

    let result
    try {
      result = JSON.parse(text)
    } catch {
      const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      result = match ? JSON.parse(match[0]) : {}
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
