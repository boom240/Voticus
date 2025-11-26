using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Voticus.Api.Contracts.Polls;
using Voticus.Api.Data;
using Voticus.Api.Domain;

namespace Voticus.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class PollsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PollsController(AppDbContext db)
    {
        _db = db;
    }

    // GET /api/polls
    [HttpGet]
    public async Task<ActionResult<IEnumerable<PollDto>>> GetPolls()
    {
        var polls = await _db.Polls
            .AsNoTracking()
            .ToListAsync();

        var result = polls.Select(p => new PollDto(
            Id: p.Id,
            Title: p.Title,
            Description: p.Description,
            ImageUrl: p.ImageUrl,
            FinishAtUtc: p.FinishAtUtc,
            Entries: null // we don't include entries in the list view
        ));

        return Ok(result);
    }

    // GET /api/polls/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<PollDto>> GetPollById(int id)
    {
        var poll = await _db.Polls
            .Include(p => p.Entries)
            .AsNoTracking()
            .SingleOrDefaultAsync(p => p.Id == id);

        if (poll is null)
        {
            return NotFound();
        }

        var entries = poll.Entries
            .OrderBy(e => e.Id)
            .Select(e => new EntryDto(
                Id: e.Id,
                PollId: e.PollId,
                Description: e.Description,
                ImageUrl: e.ImageUrl,
                VoteCount: e.VoteCount
            ))
            .ToList();

        var dto = new PollDto(
            Id: poll.Id,
            Title: poll.Title,
            Description: poll.Description,
            ImageUrl: poll.ImageUrl,
            FinishAtUtc: poll.FinishAtUtc,
            Entries: entries
        );

        return Ok(dto);
    }

    // POST /api/polls
    [HttpPost]
    public async Task<ActionResult<PollDto>> CreatePoll([FromBody] CreatePollRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
        {
            return BadRequest("Title is required.");
        }

        var poll = new Poll
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            ImageUrl = request.ImageUrl?.Trim(),
            FinishAtUtc = request.FinishAtUtc?.ToUniversalTime()
        };

        _db.Polls.Add(poll);
        await _db.SaveChangesAsync();

        var dto = new PollDto(
            Id: poll.Id,
            Title: poll.Title,
            Description: poll.Description,
            ImageUrl: poll.ImageUrl,
            FinishAtUtc: poll.FinishAtUtc,
            Entries: new List<EntryDto>()
        );

        return CreatedAtAction(
            nameof(GetPollById),
            new { id = poll.Id },   // must match route param name
            dto
        );
    }

    // POST /api/polls/{pollId}/entries
    [HttpPost("{pollId:int}/entries")]
    public async Task<ActionResult<EntryDto>> CreateEntry(
        int pollId,
        [FromBody] CreateEntryRequest request)
    {
        var pollExists = await _db.Polls.AnyAsync(p => p.Id == pollId);
        if (!pollExists)
        {
            return NotFound($"Poll {pollId} not found.");
        }

        if (string.IsNullOrWhiteSpace(request.Description))
        {
            return BadRequest("Description is required.");
        }

        var entry = new Entry
        {
            PollId = pollId,
            Description = request.Description.Trim(),
            ImageUrl = request.ImageUrl?.Trim(),
            VoteCount = 0
        };

        _db.Entries.Add(entry);
        await _db.SaveChangesAsync();

        var dto = new EntryDto(
            Id: entry.Id,
            PollId: entry.PollId,
            Description: entry.Description,
            ImageUrl: entry.ImageUrl,
            VoteCount: entry.VoteCount
        );

        return CreatedAtAction(
            nameof(GetPollById),
            new { id = pollId },
            dto
        );
    }

    // POST /api/polls/{pollId}/entries/{entryId}/vote
    [HttpPost("{pollId:int}/entries/{entryId:int}/vote")]
    public async Task<IActionResult> VoteForEntry(int pollId, int entryId)
    {
        var entry = await _db.Entries
            .SingleOrDefaultAsync(e => e.PollId == pollId && e.Id == entryId);

        if (entry is null)
        {
            return NotFound();
        }

        entry.VoteCount += 1;
        await _db.SaveChangesAsync();

        return NoContent();
    }
}
