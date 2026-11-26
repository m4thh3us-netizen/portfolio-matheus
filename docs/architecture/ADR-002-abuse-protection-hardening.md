# ADR-002 — Hardening da proteção contra abuso (IP do cliente, rate limit, tamanho do corpo)

- Status: Accepted · Date: 2026-11-19 · Owner: arquiteto
- Complementa: ADR-001 item 6 · Origem: `docs/architecture/REVIEW-backend.md` (A1, A2, A3, M1, M2, M3)

## Contexto
A revisão cruzada da fase 9 confirmou, executando a API localmente:
1. Corpos sem `Content-Length` (`Transfer-Encoding: chunked`) ignoram o `RequestSizeLimitFilter`. Corpos de 45 MB foram lidos e desserializados por inteiro; 10 requisições concorrentes causaram `OutOfMemoryError` com heap de 256 MB. Com `-XX:+ExitOnOutOfMemoryError` (Dockerfile), o processo morre e o rate limiter em memória é zerado. Os limites do Tomcat configurados (`max-swallow-size`, `max-http-form-post-size`) não se aplicam a corpos JSON.
2. Com `APP_TRUST_PROXY=true`, o IP é a **primeira** entrada do `X-Forwarded-For`, que é controlada pelo cliente (os proxies de Render/Fly/Railway *acrescentam* à direita). 7 envios com XFF rotacionado → 7 × 202. O limite por IP fica inútil e o mapa do limiter cresce sem limite.
3. Com `APP_TRUST_PROXY=false` atrás de um proxy de PaaS, `remoteAddr` é o IP do proxy: todos os visitantes compartilham um único balde de 5/10 min.
4. O limiter roda dentro do `ContactService`, portanto depois da desserialização. JSON malformado, 415 e 413 não contam (verificado: IP já bloqueado recebeu 400, não 429), contrariando `docs/api/contracts.md`.

## Decisão
1. **Limite de corpo independe de `Content-Length`.** O `RequestSizeLimitFilter` mantém o atalho por `Content-Length` declarado. Quando o tamanho é desconhecido (`-1`) e o método tem corpo, o filtro lê no máximo `max-body-bytes + 1` bytes para um buffer. Se exceder, responde 413 (mesmo ProblemDetail). Se não exceder, repassa um `HttpServletRequestWrapper` que serve o buffer (`ByteArrayInputStream`). Custo máximo de 16 KB por requisição. Nenhuma dependência nova.
2. **Resolução de IP por contagem de saltos confiáveis, nunca pela entrada mais à esquerda.** A propriedade `app.trust-proxy` (boolean) é substituída por:
   - `app.client-ip.trusted-hops` (int, env `APP_TRUSTED_PROXY_HOPS`, padrão `0`). `0` usa `remoteAddr`. `N > 0` usa a N-ésima entrada a partir da **direita** do `X-Forwarded-For`; se houver menos entradas que N, cai para `remoteAddr`.
   - `app.client-ip.header` (opcional, env `APP_CLIENT_IP_HEADER`). Cabeçalho definido pela plataforma e não falsificável pelo cliente (ex.: `Fly-Client-IP` no Fly.io). Quando definido, tem precedência.
   - O valor resolvido precisa ser um literal IPv4/IPv6 (regex `^[0-9A-Fa-f:.]{2,45}$`). Se não for, usa `remoteAddr`.
   - A chave do rate limit para IPv6 é o prefixo `/64`, porque um único cliente costuma controlar uma `/64` inteira.
   - Por compatibilidade, `APP_TRUST_PROXY=true` continua aceito durante um release e equivale a `trusted-hops=1`, com um WARN na inicialização.
3. **Memória do limiter limitada.** `app.contact.rate-limit.max-tracked-keys` (padrão `10000`). Ao atingir o teto, o limiter faz uma limpeza síncrona. Se continuar cheio, **nega** chaves novas (falha fechada → 429) e loga WARN com rate limit. Deques criados com capacidade `maxRequests`. Nenhuma dependência nova (Caffeine foi considerado e rejeitado porque não é necessário em instância única).
4. **O rate limit roda antes da leitura do corpo.** O limiter passa a ser um `HandlerInterceptor` registrado só para `POST /api/contact`. `preHandle` roda antes da resolução de argumentos, então JSON malformado e corpos inválidos também contam. A validação volta a ser `@Valid` no controller (idiomático), e o `RequestValidationException` programático pode ser removido. Exceções lançadas no `preHandle` continuam sendo tratadas pelo `GlobalExceptionHandler`.
5. **CORS antes dos filtros que respondem diretamente.** A configuração de CORS passa a ser um `CorsFilter` (`FilterRegistrationBean`, ordem `Ordered.HIGHEST_PRECEDENCE`) alimentado pela mesma `CorsProperties`. Assim, o 413 do filtro também carrega `Access-Control-Allow-Origin`.

## Consequências
+ Fecha o DoS por memória e o bypass do rate limit sem adicionar dependências.
+ O contrato ("toda tentativa conta") passa a ser verdadeiro.
− A configuração de deploy exige saber quantos proxies existem na frente da app. `docs/deploy.md` precisa de uma tabela por plataforma. O valor deve ser confirmado empiricamente após o primeiro deploy, logando `remoteAddr` + XFF uma vez em DEBUG.
− Com o teto de chaves atingido, visitantes legítimos novos podem receber 429 durante um ataque. Isso é aceitável: falha fechada é preferível a OOM.
